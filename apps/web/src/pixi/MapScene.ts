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
import type { Cell, GameElement, GameMap, Item, Obstacle, Point } from '@dnd/shared';
import {
  cellKey,
  cellToPoint,
  dimensionsInCells,
  hexCorners,
  isCellBlockedByObstacles,
  movementBlockedCells,
  neighbours,
  pointToCell,
  reachableCells,
} from '@dnd/rules-engine';

const OBSTACLE_COLORS: Record<Obstacle['type'], number> = {
  blocks_movement: 0xf87171,
  blocks_vision: 0x60a5fa,
  blocks_both: 0xc084fc,
};

const TYPE_COLORS: Record<GameElement['type'], number> = {
  player: 0x4ade80,
  monster: 0xf87171,
  npc: 0x60a5fa,
  item: 0xfbbf24,
  object: 0x94a3b8,
  trap: 0xc084fc,
};

// Maps ODDR neighbor direction index (0-5) to the pair of hex corner indices
// that form the shared edge in that direction. Corner order from hexCorners():
//   0=top-right, 1=bottom-right, 2=bottom, 3=bottom-left, 4=top-left, 5=top
const HEX_DIR_CORNERS = [[0, 1], [5, 0], [4, 5], [3, 4], [2, 3], [1, 2]] as const;

// Square orthogonal directions + the edge segment they expose (in unit fractions of gridSize)
const SQUARE_DIRS = [
  { dc: 0, dr: -1, x1: -0.5, y1: -0.5, x2: 0.5, y2: -0.5 }, // top
  { dc: 0, dr: 1, x1: -0.5, y1: 0.5, x2: 0.5, y2: 0.5 },   // bottom
  { dc: -1, dr: 0, x1: -0.5, y1: -0.5, x2: -0.5, y2: 0.5 }, // left
  { dc: 1, dr: 0, x1: 0.5, y1: -0.5, x2: 0.5, y2: 0.5 },   // right
];

export interface SceneProps {
  map: GameMap;
  elements: GameElement[];
  items: Item[];
  selectedId: string | null;
  interactive: boolean;
  autoFit: boolean;
  playerVisibleOnly: boolean;
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

  private async ensureBackground(map: GameMap): Promise<void> {
    const url = map.imageUrl || null;
    if (url === this.loadedImageUrl) return;
    this.loadedImageUrl = url;
    this.bgLayer.removeChildren();
    if (!url) return;
    try {
      const texture = await Assets.load(url);
      if (this.destroyed || this.loadedImageUrl !== url) return;
      const sprite = new Sprite(texture);
      sprite.width = map.width;
      sprite.height = map.height;
      this.bgLayer.addChild(sprite);
    } catch (err) {
      console.error('[map] failed to load background image', url, err);
    }
  }

  private requestIconTexture(url: string): Texture | undefined {
    const cached = this.iconTextures.get(url);
    if (cached !== undefined) return cached ?? undefined;
    this.iconTextures.set(url, null);
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
    if (!map.imageUrl) {
      g.rect(0, 0, map.width, map.height).fill(0x141a26);
    }

    if (map.gridType === 'square') {
      for (let x = 0; x <= map.width; x += map.gridSize) {
        g.moveTo(x, 0).lineTo(x, map.height);
      }
      for (let y = 0; y <= map.height; y += map.gridSize) {
        g.moveTo(0, y).lineTo(map.width, y);
      }
      g.stroke({ width: 1, color: 0x263144, alpha: 0.8 });
    } else if (map.gridType === 'hex') {
      const { cols, rows } = dimensionsInCells(map);
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const center = cellToPoint({ col, row }, map);
          g.poly(hexCorners(center, map.gridSize).flatMap((p) => [p.x, p.y]));
        }
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
    const { selectedId, elements } = props;
    if (!selectedId) return;
    const selected = elements.find((e) => e.id === selectedId);
    if (!selected) return;

    this.drawAttackRange(props, selected);
    this.drawMovementRange(props, selected);
  }

  /**
   * Draw a set of cells with a translucent fill and a hard border only on the
   * outer perimeter of the area (edges adjacent to cells NOT in the set).
   */
  private drawCellsOverlay(cells: Cell[], map: GameMap, color: number): void {
    if (cells.length === 0) return;
    const cellSet = new Set(cells.map(cellKey));
    const gs = map.gridSize;
    const gFill = new Graphics();
    const gBorder = new Graphics();

    if (map.gridType === 'hex') {
      for (const cell of cells) {
        const center = cellToPoint(cell, map);
        const corners = hexCorners(center, gs);
        gFill.poly(corners.flatMap((p) => [p.x, p.y]));

        const nbrs = neighbours(cell, 'hex');
        for (let d = 0; d < 6; d++) {
          if (cellSet.has(cellKey(nbrs[d]))) continue;
          const [ci, cj] = HEX_DIR_CORNERS[d];
          gBorder.moveTo(corners[ci].x, corners[ci].y).lineTo(corners[cj].x, corners[cj].y);
        }
      }
    } else {
      for (const cell of cells) {
        const center = cellToPoint(cell, map);
        gFill.rect(center.x - gs / 2, center.y - gs / 2, gs, gs);

        for (const { dc, dr, x1, y1, x2, y2 } of SQUARE_DIRS) {
          const nk = cellKey({ col: cell.col + dc, row: cell.row + dr });
          if (cellSet.has(nk)) continue;
          gBorder
            .moveTo(center.x + x1 * gs, center.y + y1 * gs)
            .lineTo(center.x + x2 * gs, center.y + y2 * gs);
        }
      }
    }

    gFill.fill({ color, alpha: 0.15 });
    gBorder.stroke({ width: 3, color, alpha: 0.88 });
    this.overlayLayer.addChild(gFill, gBorder);
  }

  private drawMovementRange(props: SceneProps, selected: GameElement): void {
    const { map, elements } = props;
    const speed = Number(selected.stats.speed ?? 0);
    if (speed <= 0) return;

    const blocked = [
      ...elements.filter((e) => e.id !== selected.id).map((e) => pointToCell(e.position, map)),
      ...movementBlockedCells(map, map.obstacles),
    ];

    const cells = reachableCells(pointToCell(selected.position, map), {
      map,
      blocked,
      range: speed,
    });

    this.drawCellsOverlay(cells, map, 0x4ade80);
  }

  private drawAttackRange(props: SceneProps, selected: GameElement): void {
    const { map, items } = props;

    // The equipped item (weapon or spell) carries its own range + colour.
    const equippedItem = selected.equippedItemId
      ? items.find((i) => i.id === selected.equippedItemId)
      : undefined;
    if (!equippedItem?.range || equippedItem.range <= 0) return;

    // Movement-blocking obstacles block ranged attacks the same way they block
    // movement — the range BFS cannot pass through them.
    const blocked = movementBlockedCells(map, map.obstacles);
    const cells = reachableCells(pointToCell(selected.position, map), {
      map,
      blocked,
      range: equippedItem.range,
    });
    const color = equippedItem.color ? parseInt(equippedItem.color.replace('#', ''), 16) : 0xf59e0b;
    this.drawCellsOverlay(cells, map, color);
  }

  private drawTokens(props: SceneProps): void {
    this.tokenLayer.removeChildren();
    const { map, elements, items, selectedId, interactive, playerVisibleOnly } = props;
    const radius = map.gridSize * 0.42;

    for (const el of elements) {
      if (playerVisibleOnly && !el.visibleToPlayers) continue;

      const token = new Container();
      token.position.set(el.position.x, el.position.y);

      const r = radius * el.size;
      const selected = el.id === selectedId;
      const ringWidth = selected ? 4 : 2;
      const ringColor = selected ? 0xffffff : 0x0b0e14;

      // Item tokens use the catalog item's custom color if defined.
      const itemDef = el.type === 'item' && el.itemId
        ? items.find((i) => i.id === el.itemId)
        : undefined;
      const tokenColor = itemDef?.color
        ? parseInt(itemDef.color.replace('#', ''), 16)
        : TYPE_COLORS[el.type];

      const icon = el.iconUrl ? this.requestIconTexture(el.iconUrl) : undefined;

      if (icon) {
        const sprite = new Sprite(icon);
        sprite.anchor.set(0.5);
        sprite.width = r * 2;
        sprite.height = r * 2;
        const mask = new Graphics().circle(0, 0, r).fill(0xffffff);
        token.addChild(sprite, mask);
        sprite.mask = mask;
        token.addChild(
          new Graphics().circle(0, 0, r).stroke({ width: ringWidth, color: tokenColor }),
        );
      } else {
        token.addChild(
          new Graphics()
            .circle(0, 0, r)
            .fill(tokenColor)
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
    const snapped =
      map.gridType === 'continuous'
        ? { x: local.x, y: local.y }
        : cellToPoint(pointToCell(local, map), map);

    const { id, container, start } = this.dragging;
    this.app.stage.off('pointermove', this.onDragMove);
    this.dragging = null;

    if (isCellBlockedByObstacles(pointToCell(snapped, map), map, map.obstacles)) {
      container.position.set(start.x, start.y);
      return;
    }
    this.props.onMove(id, snapped);
  };

  destroy(): void {
    this.destroyed = true;
    if (!this.ready) return;
    this.ready = false;
    this.app.destroy(true, { children: true });
  }
}
