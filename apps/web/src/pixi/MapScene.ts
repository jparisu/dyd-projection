import {
  Application,
  Assets,
  Container,
  Graphics,
  Sprite,
  Text,
  Texture,
  type FederatedPointerEvent,
} from 'pixi.js';
import type { GameElement, GameMap, Obstacle, Point } from '@dnd/shared';
import {
  cellToPoint,
  isCellBlockedByObstacles,
  movementBlockedCells,
  pointToCell,
  reachableCells,
} from '@dnd/rules-engine';

const OBSTACLE_COLORS: Record<Obstacle['type'], number> = {
  blocks_movement: 0xf87171, // red — can't walk through
  blocks_vision: 0x60a5fa, // blue — can't see through
  blocks_both: 0xc084fc, // purple — both
};

const TYPE_COLORS: Record<GameElement['type'], number> = {
  player: 0x4ade80,
  monster: 0xf87171,
  npc: 0x60a5fa,
  item: 0xfbbf24,
  object: 0x94a3b8,
  trap: 0xc084fc,
};

export interface SceneProps {
  map: GameMap;
  elements: GameElement[];
  selectedId: string | null;
  /** Tokens can be dragged (enabled on both DM and projector views). */
  interactive: boolean;
  /** Auto-scale the whole map to fit the viewport (projector view). */
  autoFit: boolean;
  /** Hide tokens flagged DM-only (projector view). */
  playerVisibleOnly: boolean;
  /** Draw obstacle overlays (DM always; projector toggles). */
  showObstacles: boolean;
  onSelect: (id: string | null) => void;
  onMove: (id: string, position: Point) => void;
}

/**
 * Imperative PixiJS scene. React owns data; this class owns the canvas. The
 * view component calls `update()` whenever props change and `fit()` on resize.
 */
export class MapScene {
  private app = new Application();
  private world = new Container();
  private bgLayer = new Container();
  private gridLayer = new Container();
  private obstacleLayer = new Container();
  private overlayLayer = new Container();
  private tokenLayer = new Container();
  private ready = false;
  private destroyed = false;
  private props: SceneProps | null = null;
  private dragging: { id: string; container: Container; start: Point } | null = null;
  private loadedImageUrl: string | null = null;
  /** url -> texture (null while loading / failed) so we draw icons once cached. */
  private iconTextures = new Map<string, Texture | null>();

  async init(host: HTMLElement): Promise<void> {
    if (this.destroyed) return;
    await this.app.init({
      background: 0x0b0e14,
      resizeTo: host,
      antialias: true,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
    });
    // React StrictMode (dev) mounts → unmounts → mounts. If destroy() ran during
    // the async init above, tear the now-fully-initialized app down here instead
    // of wiring it up (calling destroy() before init finished would throw).
    if (this.destroyed) {
      this.app.destroy(true, { children: true });
      return;
    }
    host.appendChild(this.app.canvas);

    this.world.addChild(
      this.bgLayer,
      this.gridLayer,
      this.obstacleLayer,
      this.overlayLayer,
      this.tokenLayer,
    );
    this.app.stage.addChild(this.world);
    this.app.stage.eventMode = 'static';
    this.app.stage.hitArea = this.app.screen;

    // Deselect on empty-space click.
    this.app.stage.on('pointerdown', (e: FederatedPointerEvent) => {
      if (e.target === this.app.stage) this.props?.onSelect(null);
    });

    this.ready = true;
    if (this.props) this.update(this.props);
  }

  update(props: SceneProps): void {
    this.props = props;
    if (!this.ready) return;
    void this.ensureBackground(props.map);
    this.drawGrid(props.map);
    this.drawObstacles(props);
    this.drawOverlay(props);
    this.drawTokens(props);
    if (props.autoFit) this.fit();
  }

  /** Load (or clear) the map background image; no-op if the URL is unchanged. */
  private async ensureBackground(map: GameMap): Promise<void> {
    const url = map.imageUrl || null;
    if (url === this.loadedImageUrl) return;
    this.loadedImageUrl = url;
    this.bgLayer.removeChildren();
    if (!url) return;
    try {
      const texture = await Assets.load(url);
      // Guard against teardown / a newer image arriving during the async load.
      if (this.destroyed || this.loadedImageUrl !== url) return;
      const sprite = new Sprite(texture);
      sprite.width = map.width;
      sprite.height = map.height;
      this.bgLayer.addChild(sprite);
    } catch (err) {
      console.error('[map] failed to load background image', url, err);
    }
  }

  /**
   * Return a cached icon texture, or kick off an async load and return undefined
   * (the caller draws a placeholder). When the load finishes we redraw tokens so
   * the icon pops in. Textures are cached by URL across redraws.
   */
  private requestIconTexture(url: string): Texture | undefined {
    const cached = this.iconTextures.get(url);
    if (cached !== undefined) return cached ?? undefined;
    this.iconTextures.set(url, null); // mark as loading
    void Assets.load(url)
      .then((texture: Texture) => {
        if (this.destroyed) return;
        this.iconTextures.set(url, texture);
        if (this.props) this.drawTokens(this.props);
      })
      .catch((err) => console.error('[token] failed to load icon', url, err));
    return undefined;
  }

  fit(): void {
    if (!this.ready || !this.props) return;
    const { width, height } = this.props.map;
    const sx = this.app.screen.width / width;
    const sy = this.app.screen.height / height;
    const scale = Math.min(sx, sy);
    this.world.scale.set(scale);
    this.world.position.set(
      (this.app.screen.width - width * scale) / 2,
      (this.app.screen.height - height * scale) / 2,
    );
  }

  private drawGrid(map: GameMap): void {
    this.gridLayer.removeChildren();
    const g = new Graphics();
    // Only paint a solid backdrop when there is no image to show through.
    if (!map.imageUrl) {
      g.rect(0, 0, map.width, map.height).fill(0x141a26);
    }

    if (map.gridType !== 'continuous') {
      for (let x = 0; x <= map.width; x += map.gridSize) {
        g.moveTo(x, 0).lineTo(x, map.height);
      }
      for (let y = 0; y <= map.height; y += map.gridSize) {
        g.moveTo(0, y).lineTo(map.width, y);
      }
      g.stroke({ width: 1, color: 0x263144, alpha: 0.8 });
    }
    g.rect(0, 0, map.width, map.height).stroke({ width: 3, color: 0x3b4a63 });
    this.gridLayer.addChild(g);
  }

  private drawObstacles(props: SceneProps): void {
    this.obstacleLayer.removeChildren();
    if (!props.showObstacles) return;

    for (const o of props.map.obstacles) {
      if (o.points.length === 0) continue;
      const color = OBSTACLE_COLORS[o.type];
      const g = new Graphics();

      switch (o.shape) {
        case 'rectangle': {
          const xs = o.points.map((p) => p.x);
          const ys = o.points.map((p) => p.y);
          const minX = Math.min(...xs);
          const minY = Math.min(...ys);
          g.rect(minX, minY, Math.max(...xs) - minX, Math.max(...ys) - minY);
          break;
        }
        case 'circle': {
          if (o.points.length < 2) continue;
          const [c, edge] = o.points;
          g.circle(c.x, c.y, Math.hypot(edge.x - c.x, edge.y - c.y));
          break;
        }
        case 'line':
          g.moveTo(o.points[0].x, o.points[0].y);
          for (const p of o.points.slice(1)) g.lineTo(p.x, p.y);
          break;
        case 'polygon':
        default:
          g.poly(o.points.flatMap((p) => [p.x, p.y]));
          break;
      }

      if (o.shape !== 'line') g.fill({ color, alpha: 0.3 });
      g.stroke({ width: 3, color, alpha: 0.9 });
      this.obstacleLayer.addChild(g);
    }
  }

  private drawOverlay(props: SceneProps): void {
    this.overlayLayer.removeChildren();
    const { selectedId, map, elements } = props;
    if (!selectedId) return;
    const selected = elements.find((e) => e.id === selectedId);
    if (!selected) return;

    const speed = Number(selected.stats.speed ?? 0);
    if (speed <= 0) return;

    const blocked = [
      ...elements.filter((e) => e.id !== selected.id).map((e) => pointToCell(e.position, map.gridSize)),
      ...movementBlockedCells(map, map.obstacles),
    ];

    const cells = reachableCells(pointToCell(selected.position, map.gridSize), {
      map,
      blocked,
      range: speed,
    });

    const g = new Graphics();
    for (const cell of cells) {
      const center = cellToPoint(cell, map.gridSize);
      g.rect(
        center.x - map.gridSize / 2,
        center.y - map.gridSize / 2,
        map.gridSize,
        map.gridSize,
      );
    }
    g.fill({ color: 0x4ade80, alpha: 0.18 });
    this.overlayLayer.addChild(g);
  }

  private drawTokens(props: SceneProps): void {
    this.tokenLayer.removeChildren();
    const { map, elements, selectedId, interactive, playerVisibleOnly } = props;
    const radius = map.gridSize * 0.42;

    for (const el of elements) {
      if (playerVisibleOnly && !el.visibleToPlayers) continue;

      const token = new Container();
      token.position.set(el.position.x, el.position.y);

      const r = radius * el.size;
      const selected = el.id === selectedId;
      const ringWidth = selected ? 4 : 2;
      const ringColor = selected ? 0xffffff : 0x0b0e14;
      const icon = el.iconUrl ? this.requestIconTexture(el.iconUrl) : undefined;

      if (icon) {
        // Circular icon image clipped to the token disc, with a coloured ring.
        const sprite = new Sprite(icon);
        sprite.anchor.set(0.5);
        sprite.width = r * 2;
        sprite.height = r * 2;
        const mask = new Graphics().circle(0, 0, r).fill(0xffffff);
        token.addChild(sprite, mask);
        sprite.mask = mask;
        token.addChild(
          new Graphics().circle(0, 0, r).stroke({ width: ringWidth, color: TYPE_COLORS[el.type] }),
        );
      } else {
        token.addChild(
          new Graphics()
            .circle(0, 0, r)
            .fill(TYPE_COLORS[el.type])
            .stroke({ width: ringWidth, color: ringColor }),
        );
      }

      const label = new Text({
        text: el.name,
        style: { fill: 0xffffff, fontSize: 13, fontWeight: '600' },
      });
      label.anchor.set(0.5, 0);
      label.position.set(0, radius * el.size + 2);
      token.addChild(label);

      if (interactive) {
        token.eventMode = 'static';
        token.cursor = 'pointer';
        this.attachDrag(token, el);
      }

      this.tokenLayer.addChild(token);
    }
  }

  private attachDrag(token: Container, el: GameElement): void {
    token.on('pointerdown', (e: FederatedPointerEvent) => {
      e.stopPropagation();
      this.props?.onSelect(el.id);
      this.dragging = {
        id: el.id,
        container: token,
        start: { x: el.position.x, y: el.position.y },
      };
      this.app.stage.on('pointermove', this.onDragMove);
    });
    token.on('pointerup', this.endDrag);
    token.on('pointerupoutside', this.endDrag);
  }

  private onDragMove = (e: FederatedPointerEvent): void => {
    if (!this.dragging) return;
    const local = this.world.toLocal(e.global);
    this.dragging.container.position.set(local.x, local.y);
  };

  private endDrag = (e: FederatedPointerEvent): void => {
    if (!this.dragging || !this.props) return;
    const local = this.world.toLocal(e.global);
    const { map } = this.props;
    // Snap to cell center for discrete grids; keep raw position for continuous.
    const snapped =
      map.gridType === 'continuous'
        ? { x: local.x, y: local.y }
        : cellToPoint(pointToCell(local, map.gridSize), map.gridSize);

    const { id, container, start } = this.dragging;
    this.app.stage.off('pointermove', this.onDragMove);
    this.dragging = null;

    // Reject drops into a movement-blocking obstacle: snap the token back.
    if (isCellBlockedByObstacles(pointToCell(snapped, map.gridSize), map, map.obstacles)) {
      container.position.set(start.x, start.y);
      return;
    }
    this.props.onMove(id, snapped);
  };

  destroy(): void {
    this.destroyed = true;
    // If init() hasn't finished, don't touch the app — it isn't fully set up yet
    // (PixiJS's resize plugin isn't attached, so destroy() would throw). init()
    // sees `destroyed` and cleans up itself once it resolves.
    if (!this.ready) return;
    this.ready = false;
    this.app.destroy(true, { children: true });
  }
}
