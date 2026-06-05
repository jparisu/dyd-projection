import { useState } from 'react';
import type { GameElement } from '@dnd/shared';
import { useGameStore } from '../store.js';

/** DM-editable detail panel for the selected element. */
export function Sidebar() {
  const state = useGameStore((s) => s.state);
  const selectedId = useGameStore((s) => s.selectedId);
  const updateToken = useGameStore((s) => s.updateToken);
  const deleteToken = useGameStore((s) => s.deleteToken);
  const uploadFile = useGameStore((s) => s.uploadFile);
  const [collapsed, setCollapsed] = useState(false);

  const element = state?.elements.find((e) => e.id === selectedId);
  const weapon = state?.weapons.find((w) => w.id === element?.equippedWeaponId);

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="absolute right-2 top-2 z-10 rounded bg-slate-800 px-3 py-1 text-sm"
      >
        ◀ Details
      </button>
    );
  }

  return (
    <aside className="flex w-72 flex-col gap-3 overflow-y-auto border-l border-slate-800 bg-slate-900 p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Selected element</h2>
        <button onClick={() => setCollapsed(true)} className="text-sm text-slate-400">
          ▶
        </button>
      </div>

      {!element && <p className="text-sm text-slate-500">Click a token to inspect it.</p>}

      {element && (
        <>
          <Field label="Name">
            <input
              className="w-full rounded bg-slate-800 px-2 py-1"
              value={element.name}
              onChange={(e) => updateToken(element.id, { name: e.target.value })}
            />
          </Field>
          <Field label="Type">
            <span className="capitalize text-slate-300">{element.type}</span>
          </Field>
          <IconField element={element} uploadFile={uploadFile} onChange={(iconUrl) => updateToken(element.id, { iconUrl })} />
          <Field label="Position">
            <span className="text-slate-400">
              {Math.round(element.position.x)}, {Math.round(element.position.y)}
            </span>
          </Field>
          <Field label="Visible to players">
            <input
              type="checkbox"
              checked={element.visibleToPlayers}
              onChange={(e) => updateToken(element.id, { visibleToPlayers: e.target.checked })}
            />
          </Field>

          <StatsEditor element={element} onChange={(stats) => updateToken(element.id, { stats })} />

          {weapon && (
            <Field label="Weapon">
              <span className="text-slate-300">
                {weapon.name} · {weapon.damage} · range {weapon.range}
              </span>
            </Field>
          )}

          <button
            onClick={() => deleteToken(element.id)}
            className="mt-2 rounded bg-red-700 px-3 py-1 text-sm hover:bg-red-600"
          >
            Delete token
          </button>
        </>
      )}
    </aside>
  );
}

function IconField({
  element,
  uploadFile,
  onChange,
}: {
  element: GameElement;
  uploadFile: (file: File) => Promise<string | undefined>;
  onChange: (iconUrl: string) => void;
}) {
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const url = await uploadFile(file);
    if (url) onChange(url);
  };

  return (
    <Field label="Icon">
      <div className="flex items-center gap-2">
        {element.iconUrl ? (
          <img
            src={element.iconUrl}
            alt=""
            className="h-10 w-10 rounded-full border border-slate-700 object-cover"
          />
        ) : (
          <div className="h-10 w-10 rounded-full border border-slate-700 bg-slate-800" />
        )}
        <label className="cursor-pointer rounded bg-slate-800 px-2 py-1 text-xs hover:bg-slate-700">
          Upload
          <input type="file" accept="image/*" onChange={onFile} className="hidden" />
        </label>
        {element.iconUrl && (
          <button
            onClick={() => onChange('')}
            className="text-xs text-slate-400 hover:text-slate-200"
          >
            Remove
          </button>
        )}
      </div>
      <input
        className="mt-1 w-full rounded bg-slate-800 px-2 py-1 text-xs"
        placeholder="or paste an image URL"
        value={element.iconUrl ?? ''}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function StatsEditor({
  element,
  onChange,
}: {
  element: GameElement;
  onChange: (stats: GameElement['stats']) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm text-slate-400">Stats</span>
      {Object.entries(element.stats).map(([key, value]) => (
        <div key={key} className="flex items-center gap-2">
          <span className="w-16 text-sm text-slate-300">{key}</span>
          <input
            className="w-full rounded bg-slate-800 px-2 py-1"
            value={String(value)}
            onChange={(e) => {
              const raw = e.target.value;
              const num = Number(raw);
              onChange({ ...element.stats, [key]: raw !== '' && !Number.isNaN(num) ? num : raw });
            }}
          />
        </div>
      ))}
    </div>
  );
}
