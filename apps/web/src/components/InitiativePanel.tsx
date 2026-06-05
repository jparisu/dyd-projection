import { useGameStore } from '../store.js';

/** Initiative order with turn advancement. `editable` only in the DM view. */
export function InitiativePanel({ editable }: { editable: boolean }) {
  const state = useGameStore((s) => s.state);
  const selectToken = useGameStore((s) => s.selectToken);
  const nextTurn = useGameStore((s) => s.nextTurn);

  if (!state || state.initiative.length === 0) {
    return <div className="p-3 text-sm text-slate-500">No initiative set.</div>;
  }

  const name = (elementId: string) =>
    state.elements.find((e) => e.id === elementId)?.name ?? elementId;
  const current = state.session.currentTurnElementId;

  return (
    <div className="flex flex-col gap-2 p-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Initiative</h2>
        {editable && (
          <button
            onClick={nextTurn}
            className="rounded bg-emerald-600 px-3 py-1 text-sm hover:bg-emerald-500"
          >
            Next turn ▶
          </button>
        )}
      </div>
      <ol className="flex flex-col gap-1">
        {[...state.initiative]
          .sort((a, b) => a.order - b.order)
          .map((entry) => {
            const active = entry.elementId === current;
            return (
              <li
                key={entry.id}
                onClick={() => selectToken(entry.elementId)}
                className={`flex cursor-pointer items-center justify-between rounded px-2 py-1 text-sm ${
                  active ? 'bg-emerald-700/40 ring-1 ring-emerald-500' : 'bg-slate-800'
                }`}
              >
                <span>{name(entry.elementId)}</span>
                <span className="text-slate-400">{entry.initiative}</span>
              </li>
            );
          })}
      </ol>
    </div>
  );
}
