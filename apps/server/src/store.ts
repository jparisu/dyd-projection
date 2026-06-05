import { randomUUID } from 'node:crypto';
import {
  DEMO_SESSION_ID,
  type GameElement,
  type GameMap,
  type InitiativeEntry,
  type SessionState,
  type Spell,
  type Weapon,
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
      equippedWeaponId: input.equippedWeaponId,
      selectedSpellId: input.selectedSpellId,
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
    weapons: [],
    spells: [],
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

  const weapons: Weapon[] = [
    { id: 'wpn-sword', name: 'Longsword', range: 1, damage: '1d8', attackType: 'melee', properties: [] },
    { id: 'wpn-bow', name: 'Shortbow', range: 16, damage: '1d6', attackType: 'ranged', properties: ['ammunition'] },
  ];
  const spells: Spell[] = [
    { id: 'spell-firebolt', name: 'Fire Bolt', range: 24, areaType: 'single', description: 'A mote of fire.' },
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
      equippedWeaponId: 'wpn-bow',
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
      equippedWeaponId: 'wpn-sword',
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
    weapons,
    spells,
  };
}
