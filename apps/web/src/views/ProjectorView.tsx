import { useEffect } from 'react';
import { useSession } from '../useSession.js';
import { useGameStore } from '../store.js';
import { MapCanvas } from '../components/MapCanvas.js';
import { InitiativePanel } from '../components/InitiativePanel.js';
import { PopupModal } from '../components/PopupModal.js';

/**
 * The table-facing screen. Fullscreen map, no controls, only player-visible
 * tokens, with an optional initiative strip. Mirrors DM state in realtime.
 */
export function ProjectorView() {
  useSession('projector');
  const state = useGameStore((s) => s.state);
  const selectedId = useGameStore((s) => s.selectedId);
  const connected = useGameStore((s) => s.connected);
  const showObstacles = useGameStore((s) => s.showObstacles);
  const toggleObstacles = useGameStore((s) => s.toggleObstacles);
  const selectToken = useGameStore((s) => s.selectToken);
  const moveToken = useGameStore((s) => s.moveToken);
  const activeMap = useGameStore((s) => s.activeMap)();

  // Press "o" to toggle obstacle overlays on the table screen.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'o' || e.key === 'O') toggleObstacles();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleObstacles]);

  if (!state || !activeMap) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500">
        {connected ? 'Waiting for the DM to load a map…' : 'Connecting…'}
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      <MapCanvas
        map={activeMap}
        elements={state.elements}
        selectedId={selectedId}
        interactive
        autoFit
        playerVisibleOnly
        showObstacles={showObstacles}
        onSelect={selectToken}
        onMove={moveToken}
      />
      {state.initiative.length > 0 && (
        <div className="absolute left-2 top-2 z-10 w-56 rounded-lg bg-slate-900/80 backdrop-blur">
          <InitiativePanel editable={false} />
        </div>
      )}
      <button
        onClick={toggleObstacles}
        title='Toggle obstacles (shortcut: "o")'
        className="absolute bottom-2 right-2 z-10 rounded bg-slate-900/70 px-3 py-1 text-sm text-slate-300 backdrop-blur hover:bg-slate-800"
      >
        {showObstacles ? 'Hide obstacles' : 'Show obstacles'}
      </button>
      <PopupModal />
    </div>
  );
}
