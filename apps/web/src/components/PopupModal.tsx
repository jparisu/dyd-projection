import { useGameStore } from '../store.js';

/** Centered modal pushed from the DM to every connected client. */
export function PopupModal() {
  const popup = useGameStore((s) => s.popup);
  const dismiss = useGameStore((s) => s.dismissPopup);
  if (!popup) return null;

  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center bg-black/60"
      onClick={dismiss}
    >
      <div
        className="max-w-lg rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {popup.title && <h2 className="mb-2 text-2xl font-bold">{popup.title}</h2>}
        <p className="whitespace-pre-wrap text-lg text-slate-200">{popup.message}</p>
        <button
          onClick={dismiss}
          className="mt-4 rounded bg-slate-700 px-4 py-2 text-sm hover:bg-slate-600"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
