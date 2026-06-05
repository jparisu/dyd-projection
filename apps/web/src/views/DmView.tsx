import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ObstacleFileSchema, type ElementType, type VisibilityMode } from '@dnd/shared';
import { useSession } from '../useSession.js';
import { useGameStore } from '../store.js';
import { MapCanvas } from '../components/MapCanvas.js';
import { Sidebar } from '../components/Sidebar.js';
import { InitiativePanel } from '../components/InitiativePanel.js';
import { PopupModal } from '../components/PopupModal.js';

/**
 * The DM control surface: full map (no fog), drag/select tokens, edit the
 * selected element, manage initiative, and push popups to the projector.
 */
export function DmView() {
  const sessionId = useSession('dm');
  const state = useGameStore((s) => s.state);
  const selectedId = useGameStore((s) => s.selectedId);
  const connected = useGameStore((s) => s.connected);
  const activeMap = useGameStore((s) => s.activeMap)();
  const selectToken = useGameStore((s) => s.selectToken);
  const moveToken = useGameStore((s) => s.moveToken);

  if (!state || !activeMap) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500">
        {connected ? 'Loading session…' : 'Connecting…'}
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col">
      <Toolbar sessionId={sessionId} connected={connected} />
      <div className="flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1">
          <MapCanvas
            map={activeMap}
            elements={state.elements}
            selectedId={selectedId}
            interactive
            autoFit={false}
            playerVisibleOnly={false}
            showObstacles
            onSelect={selectToken}
            onMove={moveToken}
          />
          <PopupModal />
        </div>
        <div className="flex w-72 flex-col border-l border-slate-800">
          <Sidebar />
          <div className="border-t border-slate-800">
            <InitiativePanel editable />
          </div>
        </div>
      </div>
    </div>
  );
}

function Toolbar({ sessionId, connected }: { sessionId: string; connected: boolean }) {
  const state = useGameStore((s) => s.state);
  const activeMap = useGameStore((s) => s.activeMap)();
  const createToken = useGameStore((s) => s.createToken);
  const setVisibility = useGameStore((s) => s.setVisibility);
  const sendPopup = useGameStore((s) => s.sendPopup);
  const uploadMapImage = useGameStore((s) => s.uploadMapImage);
  const loadObstacles = useGameStore((s) => s.loadObstacles);
  const [popupText, setPopupText] = useState('');

  const visibility = state?.session.visibilityMode ?? 'all';

  const addToken = (type: ElementType) => {
    if (!activeMap) return;
    createToken({
      mapId: activeMap.id,
      type,
      name: type === 'player' ? 'New hero' : 'New monster',
      position: { x: activeMap.width / 2, y: activeMap.height / 2 },
      stats: { hp: 10, speed: 6 },
    });
  };

  const toggleVisibility = () => {
    const next: VisibilityMode = visibility === 'all' ? 'fog_of_war' : 'all';
    setVisibility(next);
  };

  const submitPopup = () => {
    const message = popupText.trim();
    if (!message) return;
    sendPopup({ message });
    setPopupText('');
  };

  const onImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void uploadMapImage(file);
    e.target.value = '';
  };

  const onObstacleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const parsed = ObstacleFileSchema.parse(JSON.parse(await file.text()));
      const obstacles = Array.isArray(parsed) ? parsed : parsed.obstacles;
      loadObstacles(obstacles);
    } catch (err) {
      console.error('[obstacles] invalid file', err);
      alert('Could not load obstacles: the file is not valid JSON in the expected format.');
    }
  };

  return (
    <header className="flex flex-wrap items-center gap-2 border-b border-slate-800 bg-slate-900 px-3 py-2 text-sm">
      <span className="font-semibold">DM · {sessionId}</span>
      <span
        className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-red-500'}`}
        title={connected ? 'connected' : 'disconnected'}
      />
      <div className="mx-2 h-5 w-px bg-slate-700" />

      <button onClick={() => addToken('player')} className="rounded bg-emerald-700 px-2 py-1 hover:bg-emerald-600">
        + Player
      </button>
      <button onClick={() => addToken('monster')} className="rounded bg-red-700 px-2 py-1 hover:bg-red-600">
        + Monster
      </button>
      <button onClick={toggleVisibility} className="rounded bg-slate-700 px-2 py-1 hover:bg-slate-600">
        Vision: {visibility === 'all' ? 'All' : 'Fog of war'}
      </button>

      <div className="mx-2 h-5 w-px bg-slate-700" />
      <label className="cursor-pointer rounded bg-slate-700 px-2 py-1 hover:bg-slate-600">
        Load map image
        <input type="file" accept="image/*" onChange={onImageFile} className="hidden" />
      </label>
      <label className="cursor-pointer rounded bg-slate-700 px-2 py-1 hover:bg-slate-600">
        Load obstacles
        <input type="file" accept="application/json,.json" onChange={onObstacleFile} className="hidden" />
      </label>

      <div className="mx-2 h-5 w-px bg-slate-700" />
      <input
        value={popupText}
        onChange={(e) => setPopupText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submitPopup()}
        placeholder="Popup message to table…"
        className="w-56 rounded bg-slate-800 px-2 py-1"
      />
      <button onClick={submitPopup} className="rounded bg-slate-700 px-2 py-1 hover:bg-slate-600">
        Send popup
      </button>

      <Link
        to={`/play/${sessionId}`}
        target="_blank"
        className="ml-auto rounded bg-slate-700 px-2 py-1 hover:bg-slate-600"
      >
        Open projector ↗
      </Link>
    </header>
  );
}
