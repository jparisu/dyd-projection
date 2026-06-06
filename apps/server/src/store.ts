import { randomUUID } from 'node:crypto';
import {
  DEMO_SESSION_ID,
  type GameElement,
  type GameMap,
  type InitiativeEntry,
  type Item,
  type SessionState,
} from '@dnd/shared';

/**
 * In-memory session store. Phase 1 keeps everything in process memory; the
 * method surface mirrors what a persistent (Prisma) store will later expose,
 * so swapping the backing store should not touch the socket layer.
 */
export class SessionStore {
  private sessions = new Map<string, SessionState>();

  constructor() {
    this.sessions.set(DEMO_SESSION_ID, buildDemoSession());
  }

  /** Get a session, creating an empty one on first access. */
  getOrCreate(sessionId: string): SessionState {
    let state = this.sessions.get(sessionId);
    if (!state) {
      state = buildEmptySession(sessionId);
      this.sessions.set(sessionId, state);
    }
    return state;
  }

  setActiveMap(sessionId: string, mapId: string): SessionState {
    const state = this.getOrCreate(sessionId);
    state.session.activeMapId = mapId;
    return this.touch(state);
  }

  setVisibility(sessionId: string, mode: SessionState['session']['visibilityMode']): SessionState {
    const state = this.getOrCreate(sessionId);
    state.session.visibilityMode = mode;
    return this.touch(state);
  }

  getMap(sessionId: string, mapId: string): GameMap | undefined {
    return this.getOrCreate(sessionId).maps.find((m) => m.id === mapId);
  }

  setGrid(
    sessionId: string,
    mapId: string,
    gridType: GameMap['gridType'],
    gridSize: number,
  ): GameMap | undefined {
    const map = this.getMap(sessionId, mapId);
    if (!map) return undefined;
    map.gridType = gridType;
    map.gridSize = gridSize;
    this.touch(this.getOrCreate(sessionId));
    return map;
  }

  setMapImage(sessionId: string, mapId: string, imageUrl: string): GameMap | undefined {
    const map = this.getMap(sessionId, mapId);
    if (!map) return undefined;
    map.imageUrl = imageUrl;
    this.touch(this.getOrCreate(sessionId));
    return map;
  }

  /** Replace a map's obstacles, assigning fresh ids + mapId to each entry. */
  setObstacles(
    sessionId: string,
    mapId: string,
    obstacles: Omit<GameMap['obstacles'][number], 'id' | 'mapId'>[],
  ): GameMap | undefined {
    const map = this.getMap(sessionId, mapId);
    if (!map) return undefined;
    map.obstacles = obstacles.map((o) => ({ ...o, id: randomUUID(), mapId }));
    this.touch(this.getOrCreate(sessionId));
    return map;
  }

  createElement(sessionId: string, input: Partial<GameElement> & Pick<GameElement, 'position' | 'mapId'>): GameElement {
    const state = this.getOrCreate(sessionId);
    const element: GameElement = {
      id: input.id ?? randomUUID(),
      sessionId,
      mapId: input.mapId,
      type: input.type ?? 'monster',
      name: input.name ?? 'New token',
      iconUrl: input.iconUrl,
      position: input.position,
      size: input.size ?? 1,
      visibleToPlayers: input.visibleToPlayers ?? true,
      stats: input.stats ?? { hp: 10, speed: 6 },
      equippedItemId: input.equippedItemId,
      inventory: input.inventory ?? [],
      itemId: input.itemId,
    };
    state.elements.push(element);
    this.touch(state);
    return element;
  }

  updateElement(sessionId: string, id: string, patch: Partial<GameElement>): GameElement | undefined {
    const state = this.getOrCreate(sessionId);
    const element = state.elements.find((e) => e.id === id);
    if (!element) return undefined;
    Object.assign(element, patch, { id: element.id, sessionId: element.sessionId });
    this.touch(state);
    return element;
  }

  moveElement(sessionId: string, id: string, position: GameElement['position']): GameElement | undefined {
    return this.updateElement(sessionId, id, { position });
  }

  getElement(sessionId: string, id: string): GameElement | undefined {
    return this.getOrCreate(sessionId).elements.find((e) => e.id === id);
  }

  // ---- Item catalog -------------------------------------------------------

  createItem(sessionId: string, input: Omit<Item, 'id'>): Item {
    const state = this.getOrCreate(sessionId);
    const item: Item = { ...input, id: randomUUID() };
    state.items.push(item);
    this.touch(state);
    return item;
  }

  updateItem(sessionId: string, id: string, patch: Partial<Item>): Item | undefined {
    const state = this.getOrCreate(sessionId);
    const item = state.items.find((i) => i.id === id);
    if (!item) return undefined;
    Object.assign(item, patch, { id: item.id });
    this.touch(state);
    return item;
  }

  /** Remove an item from the catalog and scrub references to it from elements. */
  deleteItem(sessionId: string, id: string): boolean {
    const state = this.getOrCreate(sessionId);
    const before = state.items.length;
    state.items = state.items.filter((i) => i.id !== id);
    if (state.items.length === before) return false;
    for (const el of state.elements) {
      if (el.inventory.includes(id)) el.inventory = el.inventory.filter((x) => x !== id);
      if (el.equippedItemId === id) el.equippedItemId = undefined;
    }
    // Drop loose map tokens that represented this item.
    state.elements = state.elements.filter((e) => e.itemId !== id);
    this.touch(state);
    return true;
  }

  /**
   * Move an item from a carrier's inventory onto the map as an item-token at the
   * carrier's position. Returns the updated carrier and the new map token.
   */
  dropItem(
    sessionId: string,
    elementId: string,
    itemId: string,
  ): { carrier: GameElement; dropped: GameElement } | undefined {
    const state = this.getOrCreate(sessionId);
    const carrier = state.elements.find((e) => e.id === elementId);
    if (!carrier) return undefined;
    const idx = carrier.inventory.indexOf(itemId);
    if (idx === -1) return undefined;
    carrier.inventory = carrier.inventory.filter((_, i) => i !== idx);
    const item = state.items.find((i) => i.id === itemId);
    const dropped = this.createElement(sessionId, {
      mapId: carrier.mapId,
      type: 'item',
      name: item?.name ?? 'Item',
      iconUrl: item?.iconUrl,
      position: { ...carrier.position },
      itemId,
    });
    this.touch(state);
    return { carrier, dropped };
  }

  /** Pick up a map item-token into an element's inventory; removes the token. */
  pickupItem(
    sessionId: string,
    elementId: string,
    itemElementId: string,
  ): { carrier: GameElement; removedId: string } | undefined {
    const state = this.getOrCreate(sessionId);
    const carrier = state.elements.find((e) => e.id === elementId);
    const itemToken = state.elements.find((e) => e.id === itemElementId);
    if (!carrier || !itemToken || itemToken.type !== 'item' || !itemToken.itemId) return undefined;
    carrier.inventory = [...carrier.inventory, itemToken.itemId];
    state.elements = state.elements.filter((e) => e.id !== itemElementId);
    this.touch(state);
    return { carrier, removedId: itemElementId };
  }

  deleteElement(sessionId: string, id: string): boolean {
    const state = this.getOrCreate(sessionId);
    const before = state.elements.length;
    state.elements = state.elements.filter((e) => e.id !== id);
    state.initiative = state.initiative.filter((i) => i.elementId !== id);
    this.touch(state);
    return state.elements.length < before;
  }

  setInitiative(sessionId: string, entries: InitiativeEntry[]): SessionState {
    const state = this.getOrCreate(sessionId);
    state.initiative = entries;
    return this.touch(state);
  }

  setCurrentTurn(sessionId: string, elementId: string | undefined): SessionState {
    const state = this.getOrCreate(sessionId);
    state.session.currentTurnElementId = elementId;
    return this.touch(state);
  }

  private touch(state: SessionState): SessionState {
    state.session.updatedAt = new Date().toISOString();
    return state;
  }
}

function buildEmptySession(sessionId: string): SessionState {
  const now = new Date().toISOString();
  return {
    session: {
      id: sessionId,
      campaignId: 'default',
      name: sessionId,
      visibilityMode: 'all',
      createdAt: now,
      updatedAt: now,
    },
    maps: [],
    elements: [],
    initiative: [],
    items: [],
  };
}

function buildDemoSession(): SessionState {
  const now = new Date().toISOString();
  const map: GameMap = {
    id: 'map-1',
    campaignId: 'default',
    name: 'Tavern brawl',
    imageUrl: '', // empty => the client renders a grid backdrop
    width: 1000,
    height: 700,
    gridType: 'square',
    gridSize: 50,
    obstacles: [
      {
        id: 'obs-wall',
        mapId: 'map-1',
        type: 'blocks_both',
        shape: 'rectangle',
        points: [
          { x: 400, y: 150 },
          { x: 450, y: 500 },
        ],
      },
      {
        id: 'obs-pillar',
        mapId: 'map-1',
        type: 'blocks_vision',
        shape: 'circle',
        points: [
          { x: 700, y: 250 },
          { x: 760, y: 250 },
        ],
      },
    ],
  };

  const items: Item[] = [
    {
      id: 'item-sword', name: 'Longsword', description: 'A trusty blade.',
      attackType: 'melee', range: 1, damage: '1d8', color: '#ef4444', properties: { weight: 3 },
    },
    {
      id: 'item-bow', name: 'Shortbow', description: 'A simple bow.',
      attackType: 'ranged', range: 16, damage: '1d6', color: '#f59e0b', properties: { weight: 2 },
    },
    // Spells are items too (merged): area shape lives on the item.
    {
      id: 'item-firebolt', name: 'Fire Bolt', description: 'A mote of fire.',
      attackType: 'ranged', range: 24, damage: '1d10', areaType: 'single', color: '#fb923c', properties: { level: 0 },
    },
    {
      id: 'item-fireball', name: 'Fireball', description: 'A burst of flame.',
      attackType: 'ranged', range: 30, damage: '8d6', areaType: 'sphere', areaSize: 4, color: '#f97316', properties: { level: 3 },
    },
    {
      id: 'item-potion', name: 'Healing Potion', description: 'Restores 2d4+2 HP.',
      color: '#34d399', properties: { charges: 1 },
    },
    { id: 'item-key', name: 'Rusty Key', description: 'Opens something, somewhere.', color: '#94a3b8', properties: {} },
  ];

  const elements: GameElement[] = [
    {
      id: 'el-hero',
      sessionId: DEMO_SESSION_ID,
      mapId: map.id,
      type: 'player',
      name: 'Aria',
      position: { x: 175, y: 175 },
      size: 1,
      visibleToPlayers: true,
      stats: { hp: 24, speed: 6 },
      equippedItemId: 'item-bow',
      inventory: ['item-bow', 'item-sword', 'item-firebolt', 'item-potion'],
    },
    {
      id: 'el-goblin',
      sessionId: DEMO_SESSION_ID,
      mapId: map.id,
      type: 'monster',
      name: 'Goblin',
      position: { x: 625, y: 425 },
      size: 1,
      visibleToPlayers: true,
      stats: { hp: 7, speed: 6 },
      equippedItemId: 'item-sword',
      inventory: ['item-sword'],
    },
    {
      id: 'el-loot',
      sessionId: DEMO_SESSION_ID,
      mapId: map.id,
      type: 'item',
      name: 'Healing Potion',
      position: { x: 325, y: 575 },
      size: 1,
      visibleToPlayers: true,
      stats: {},
      inventory: [],
      itemId: 'item-potion',
    },
  ];

  const initiative: InitiativeEntry[] = [
    { id: 'ini-1', sessionId: DEMO_SESSION_ID, elementId: 'el-hero', initiative: 18, order: 0, hasActed: false },
    { id: 'ini-2', sessionId: DEMO_SESSION_ID, elementId: 'el-goblin', initiative: 12, order: 1, hasActed: false },
  ];

  return {
    session: {
      id: DEMO_SESSION_ID,
      campaignId: 'default',
      name: 'Demo session',
      activeMapId: map.id,
      visibilityMode: 'all',
      currentTurnElementId: 'el-hero',
      createdAt: now,
      updatedAt: now,
    },
    maps: [map],
    elements,
    initiative,
    items,
  };
}
