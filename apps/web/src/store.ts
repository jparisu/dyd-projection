import { create } from 'zustand';
import type {
  ClientRole,
  GameElement,
  GameMap,
  InitiativeEntry,
  ObstacleInput,
  Point,
  Popup,
  SessionState,
  TokenCreateInput,
  VisibilityMode,
} from '@dnd/shared';
import { createSocket, type AppSocket } from './socket.js';

interface GameStore {
  socket: AppSocket | null;
  connected: boolean;
  role: ClientRole;
  sessionId: string | null;
  state: SessionState | null;
  selectedId: string | null;
  popup: Popup | null;
  showObstacles: boolean;

  connect: (sessionId: string, role: ClientRole) => void;
  disconnect: () => void;

  // DM actions (emit to server)
  selectToken: (id: string | null) => void;
  moveToken: (id: string, position: Point) => void;
  createToken: (input: TokenCreateInput) => void;
  updateToken: (id: string, patch: Partial<GameElement>) => void;
  deleteToken: (id: string) => void;
  setVisibility: (mode: VisibilityMode) => void;
  setInitiative: (entries: InitiativeEntry[]) => void;
  nextTurn: () => void;
  sendPopup: (popup: Popup) => void;
  dismissPopup: () => void;
  uploadMapImage: (file: File) => Promise<void>;
  uploadFile: (file: File) => Promise<string | undefined>;
  loadObstacles: (obstacles: ObstacleInput[]) => void;
  toggleObstacles: () => void;

  // derived helpers
  activeMap: () => GameMap | undefined;
  elementById: (id: string) => GameElement | undefined;
}

export const useGameStore = create<GameStore>((set, get) => ({
  socket: null,
  connected: false,
  role: 'projector',
  sessionId: null,
  state: null,
  selectedId: null,
  popup: null,
  showObstacles: true,

  connect: (sessionId, role) => {
    get().socket?.disconnect();
    const socket = createSocket();
    set({ socket, role, sessionId, connected: false });

    socket.on('connect', () => {
      set({ connected: true });
      socket.emit('session:join', { sessionId, role });
    });
    socket.on('disconnect', () => set({ connected: false }));

    socket.on('session:state', (state) => set({ state }));

    socket.on('map:updated', (map) =>
      set((s) =>
        s.state
          ? {
              state: {
                ...s.state,
                maps: s.state.maps.some((m) => m.id === map.id)
                  ? s.state.maps.map((m) => (m.id === map.id ? map : m))
                  : [...s.state.maps, map],
              },
            }
          : s,
      ),
    );

    socket.on('token:created', (element) =>
      set((s) => (s.state ? { state: { ...s.state, elements: [...s.state.elements, element] } } : s)),
    );
    socket.on('token:updated', (element) =>
      set((s) =>
        s.state
          ? {
              state: {
                ...s.state,
                elements: s.state.elements.map((e) => (e.id === element.id ? element : e)),
              },
            }
          : s,
      ),
    );
    socket.on('token:moved', ({ id, position }) =>
      set((s) =>
        s.state
          ? {
              state: {
                ...s.state,
                elements: s.state.elements.map((e) => (e.id === id ? { ...e, position } : e)),
              },
            }
          : s,
      ),
    );
    socket.on('token:deleted', ({ id }) =>
      set((s) =>
        s.state
          ? {
              selectedId: s.selectedId === id ? null : s.selectedId,
              state: { ...s.state, elements: s.state.elements.filter((e) => e.id !== id) },
            }
          : s,
      ),
    );
    socket.on('token:selected', ({ id }) => set({ selectedId: id }));
    socket.on('initiative:updated', (initiative) =>
      set((s) => (s.state ? { state: { ...s.state, initiative } } : s)),
    );
    socket.on('visibility:updated', ({ mode }) =>
      set((s) =>
        s.state ? { state: { ...s.state, session: { ...s.state.session, visibilityMode: mode } } } : s,
      ),
    );
    socket.on('dm:popup', (popup) => set({ popup }));
    socket.on('error', ({ message }) => console.error('[server error]', message));
  },

  disconnect: () => {
    get().socket?.disconnect();
    set({ socket: null, connected: false, state: null });
  },

  selectToken: (id) => {
    set({ selectedId: id });
    if (id) get().socket?.emit('token:select', { id });
  },
  moveToken: (id, position) => get().socket?.emit('token:move', { id, position }),
  createToken: (input) => get().socket?.emit('token:create', input),
  updateToken: (id, patch) => get().socket?.emit('token:update', { id, patch }),
  deleteToken: (id) => get().socket?.emit('token:delete', { id }),
  setVisibility: (mode) => get().socket?.emit('visibility:set-mode', { mode }),
  setInitiative: (entries) => get().socket?.emit('initiative:update', entries),
  nextTurn: () => get().socket?.emit('initiative:next-turn'),
  sendPopup: (popup) => get().socket?.emit('dm:send-popup', popup),
  dismissPopup: () => set({ popup: null }),

  uploadMapImage: async (file) => {
    const { sessionId } = get();
    const map = get().activeMap();
    if (!sessionId || !map) return;
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`/api/sessions/${sessionId}/maps/${map.id}/image`, {
      method: 'POST',
      body: form,
    });
    if (!res.ok) console.error('[upload] map image failed', res.status);
    // The server broadcasts `map:updated`, which updates the store.
  },
  uploadFile: async (file) => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/uploads', { method: 'POST', body: form });
    if (!res.ok) {
      console.error('[upload] file failed', res.status);
      return undefined;
    }
    const { url } = (await res.json()) as { url: string };
    return url;
  },
  loadObstacles: (obstacles) => {
    const map = get().activeMap();
    if (!map) return;
    get().socket?.emit('obstacles:set', { mapId: map.id, obstacles });
  },
  toggleObstacles: () => set((s) => ({ showObstacles: !s.showObstacles })),

  activeMap: () => {
    const s = get().state;
    if (!s) return undefined;
    return s.maps.find((m) => m.id === s.session.activeMapId) ?? s.maps[0];
  },
  elementById: (id) => get().state?.elements.find((e) => e.id === id),
}));
