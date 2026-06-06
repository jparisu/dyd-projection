import { Link } from 'react-router-dom';
import { DEMO_SESSION_ID } from '@dnd/shared';

export function Home() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-4xl font-bold">D&D Projector</h1>
      <p className="max-w-md text-slate-400">
        Open the DM view to control the table, and the projector view on the shared screen. Both
        connect to the same session in realtime.
      </p>
      <div className="flex gap-4">
        <Link
          to={`/dm/${DEMO_SESSION_ID}`}
          className="rounded-lg bg-emerald-600 px-6 py-3 font-semibold hover:bg-emerald-500"
        >
          DM view
        </Link>
        <Link
          to={`/play/${DEMO_SESSION_ID}`}
          className="rounded-lg bg-slate-700 px-6 py-3 font-semibold hover:bg-slate-600"
        >
          Projector view
        </Link>
        <Link
          to={`/obstacles/${DEMO_SESSION_ID}`}
          className="rounded-lg bg-amber-800 px-6 py-3 font-semibold hover:bg-amber-700"
        >
          Obstacle editor
        </Link>
      </div>
      <p className="text-sm text-slate-500">Session: {DEMO_SESSION_ID}</p>
    </div>
  );
}
