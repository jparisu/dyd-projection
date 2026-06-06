import { useState } from 'react';
import type { GameElement, Item } from '@dnd/shared';
import { useGameStore } from '../store.js';

type SidebarTab = 'token' | 'catalog';

/** DM-editable detail panel + item catalog management. */
export function Sidebar() {
  const [tab, setTab] = useState<SidebarTab>('token');
  const [collapsed, setCollapsed] = useState(false);

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
    <aside className="flex w-72 flex-col gap-2 overflow-y-auto border-l border-slate-800 bg-slate-900 p-3">
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {(['token', 'catalog'] as SidebarTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded px-3 py-1 text-sm capitalize ${tab === t ? 'bg-slate-600 font-semibold' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
            >
              {t}
            </button>
          ))}
        </div>
        <button onClick={() => setCollapsed(true)} className="text-sm text-slate-400">▶</button>
      </div>

      {tab === 'token' ? <TokenTab /> : <CatalogTab />}
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Token tab — selected element details (unchanged from original)
// ---------------------------------------------------------------------------

function TokenTab() {
  const state = useGameStore((s) => s.state);
  const selectedId = useGameStore((s) => s.selectedId);
  const updateToken = useGameStore((s) => s.updateToken);
  const deleteToken = useGameStore((s) => s.deleteToken);
  const uploadFile = useGameStore((s) => s.uploadFile);
  const dropItem = useGameStore((s) => s.dropItem);
  const pickupItem = useGameStore((s) => s.pickupItem);

  const element = state?.elements.find((e) => e.id === selectedId);

  if (!element) {
    return <p className="text-sm text-slate-500">Click a token to inspect it.</p>;
  }

  return (
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

      {element.type !== 'item' && (
        <>
          <EquipmentPanel element={element} items={state?.items ?? []} onChange={updateToken} />
          <InventoryPanel
            element={element}
            items={state?.items ?? []}
            mapItems={(state?.elements ?? []).filter((e) => e.type === 'item' && e.itemId)}
            onChange={updateToken}
            onDrop={dropItem}
            onPickup={pickupItem}
          />
        </>
      )}

      <button
        onClick={() => deleteToken(element.id)}
        className="mt-2 rounded bg-red-700 px-3 py-1 text-sm hover:bg-red-600"
      >
        Delete token
      </button>
    </>
  );
}

// ---------------------------------------------------------------------------
// Catalog tab — create / edit / delete items
// ---------------------------------------------------------------------------

type AreaType = '' | 'single' | 'cone' | 'sphere' | 'line' | 'cube';

type ItemFormState = {
  name: string;
  description: string;
  color: string;
  iconUrl: string;
  attackType: '' | 'melee' | 'ranged';
  range: string;
  damage: string;
  areaType: AreaType;
  areaSize: string;
  props: { key: string; value: string }[];
};

const EMPTY_FORM: ItemFormState = {
  name: '',
  description: '',
  color: '#fbbf24',
  iconUrl: '',
  attackType: '',
  range: '',
  damage: '',
  areaType: '',
  areaSize: '',
  props: [],
};

function itemToForm(item: Item): ItemFormState {
  return {
    name: item.name,
    description: item.description,
    color: item.color ?? '#fbbf24',
    iconUrl: item.iconUrl ?? '',
    attackType: item.attackType ?? '',
    range: item.range != null ? String(item.range) : '',
    damage: item.damage ?? '',
    areaType: item.areaType ?? '',
    areaSize: item.areaSize != null ? String(item.areaSize) : '',
    props: Object.entries(item.properties ?? {}).map(([key, value]) => ({
      key,
      value: String(value),
    })),
  };
}

function formToItemInput(form: ItemFormState) {
  const properties: Record<string, string | number> = {};
  for (const { key, value } of form.props) {
    if (!key.trim()) continue;
    const num = Number(value);
    properties[key.trim()] = value !== '' && !Number.isNaN(num) ? num : value;
  }
  return {
    name: form.name.trim(),
    description: form.description,
    color: form.color || undefined,
    iconUrl: form.iconUrl || undefined,
    attackType: (form.attackType || undefined) as 'melee' | 'ranged' | undefined,
    range: form.range !== '' ? Number(form.range) : undefined,
    damage: form.damage || undefined,
    areaType: (form.areaType || undefined) as Exclude<AreaType, ''> | undefined,
    areaSize: form.areaSize !== '' ? Number(form.areaSize) : undefined,
    properties,
  };
}

function CatalogTab() {
  const state = useGameStore((s) => s.state);
  const createItem = useGameStore((s) => s.createItem);
  const updateItem = useGameStore((s) => s.updateItem);
  const deleteItem = useGameStore((s) => s.deleteItem);
  const uploadFile = useGameStore((s) => s.uploadFile);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<ItemFormState>(EMPTY_FORM);

  const items = state?.items ?? [];

  const startCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setCreating(true);
  };

  const startEdit = (item: Item) => {
    setCreating(false);
    setEditingId(item.id);
    setForm(itemToForm(item));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setCreating(false);
  };

  const submitCreate = () => {
    const input = formToItemInput(form);
    if (!input.name) return;
    createItem(input);
    setCreating(false);
    setForm(EMPTY_FORM);
  };

  const submitEdit = () => {
    if (!editingId) return;
    updateItem(editingId, formToItemInput(form));
    setEditingId(null);
  };

  const patchForm = (patch: Partial<ItemFormState>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  const addProp = () => patchForm({ props: [...form.props, { key: '', value: '' }] });
  const removeProp = (i: number) =>
    patchForm({ props: form.props.filter((_, idx) => idx !== i) });
  const setProp = (i: number, field: 'key' | 'value', val: string) => {
    const next = [...form.props];
    next[i] = { ...next[i], [field]: val };
    patchForm({ props: next });
  };

  const onIconFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const url = await uploadFile(file);
    if (url) patchForm({ iconUrl: url });
  };

  const isFormOpen = creating || editingId !== null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-300">Items ({items.length})</span>
        {!isFormOpen && (
          <button
            onClick={startCreate}
            className="rounded bg-emerald-700 px-2 py-1 text-xs hover:bg-emerald-600"
          >
            + New item
          </button>
        )}
      </div>

      {/* Item list */}
      {!isFormOpen && (
        <ul className="flex flex-col gap-1">
          {items.length === 0 && (
            <li className="text-xs text-slate-500">No items yet. Create one above.</li>
          )}
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-2 rounded bg-slate-800 px-2 py-1 text-sm"
            >
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: item.color ?? '#fbbf24' }}
              />
              <span className="flex-1 truncate">{item.name}</span>
              {item.range != null && item.range > 0 && (
                <span className="shrink-0 text-xs text-slate-400">r{item.range}</span>
              )}
              <button
                onClick={() => startEdit(item)}
                className="shrink-0 rounded px-1 text-xs text-slate-400 hover:text-slate-100"
              >
                ✎
              </button>
              <button
                onClick={() => deleteItem(item.id)}
                className="shrink-0 rounded px-1 text-xs text-red-500 hover:text-red-400"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Create / edit form */}
      {isFormOpen && (
        <div className="flex flex-col gap-2 rounded bg-slate-800/60 p-2">
          <span className="text-xs font-semibold text-slate-300">
            {creating ? 'New item' : 'Edit item'}
          </span>

          <Field label="Name">
            <input
              autoFocus
              className="w-full rounded bg-slate-800 px-2 py-1 text-sm"
              value={form.name}
              onChange={(e) => patchForm({ name: e.target.value })}
              placeholder="Item name"
            />
          </Field>

          <Field label="Description">
            <textarea
              className="w-full rounded bg-slate-800 px-2 py-1 text-sm"
              rows={2}
              value={form.description}
              onChange={(e) => patchForm({ description: e.target.value })}
            />
          </Field>

          <Field label="Color">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.color}
                onChange={(e) => patchForm({ color: e.target.value })}
                className="h-7 w-10 cursor-pointer rounded border-0 bg-transparent p-0"
              />
              <input
                className="w-24 rounded bg-slate-800 px-2 py-1 text-xs font-mono"
                value={form.color}
                onChange={(e) => patchForm({ color: e.target.value })}
              />
            </div>
          </Field>

          <Field label="Icon">
            <div className="flex items-center gap-2">
              {form.iconUrl && (
                <img src={form.iconUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
              )}
              <label className="cursor-pointer rounded bg-slate-700 px-2 py-1 text-xs hover:bg-slate-600">
                Upload
                <input type="file" accept="image/*" onChange={onIconFile} className="hidden" />
              </label>
            </div>
            <input
              className="mt-1 w-full rounded bg-slate-800 px-2 py-1 text-xs"
              placeholder="or paste URL"
              value={form.iconUrl}
              onChange={(e) => patchForm({ iconUrl: e.target.value })}
            />
          </Field>

          <div className="flex gap-2">
            <Field label="Attack type">
              <select
                className="w-full rounded bg-slate-800 px-1 py-1 text-xs"
                value={form.attackType}
                onChange={(e) => patchForm({ attackType: e.target.value as ItemFormState['attackType'] })}
              >
                <option value="">— none —</option>
                <option value="melee">Melee</option>
                <option value="ranged">Ranged</option>
              </select>
            </Field>
            <Field label="Range (cells)">
              <input
                type="number"
                min={0}
                className="w-full rounded bg-slate-800 px-2 py-1 text-xs"
                value={form.range}
                placeholder="0"
                onChange={(e) => patchForm({ range: e.target.value })}
              />
            </Field>
          </div>

          <Field label="Damage dice">
            <input
              className="w-full rounded bg-slate-800 px-2 py-1 text-xs"
              placeholder="e.g. 1d8+3"
              value={form.damage}
              onChange={(e) => patchForm({ damage: e.target.value })}
            />
          </Field>

          {/* Spell area (leave as none for plain weapons) */}
          <div className="flex gap-2">
            <Field label="Spell area">
              <select
                className="w-full rounded bg-slate-800 px-1 py-1 text-xs"
                value={form.areaType}
                onChange={(e) => patchForm({ areaType: e.target.value as AreaType })}
              >
                <option value="">— not a spell —</option>
                <option value="single">Single</option>
                <option value="cone">Cone</option>
                <option value="sphere">Sphere</option>
                <option value="line">Line</option>
                <option value="cube">Cube</option>
              </select>
            </Field>
            <Field label="Area size">
              <input
                type="number"
                min={0}
                className="w-full rounded bg-slate-800 px-2 py-1 text-xs"
                value={form.areaSize}
                placeholder="0"
                onChange={(e) => patchForm({ areaSize: e.target.value })}
              />
            </Field>
          </div>

          {/* Custom properties */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Custom properties</span>
              <button
                onClick={addProp}
                className="rounded px-1 py-0.5 text-xs text-slate-400 hover:text-slate-200"
              >
                + Add
              </button>
            </div>
            {form.props.map((p, i) => (
              <div key={i} className="flex items-center gap-1">
                <input
                  className="w-1/2 rounded bg-slate-800 px-1 py-0.5 text-xs"
                  placeholder="key"
                  value={p.key}
                  onChange={(e) => setProp(i, 'key', e.target.value)}
                />
                <input
                  className="w-1/2 rounded bg-slate-800 px-1 py-0.5 text-xs"
                  placeholder="value"
                  value={p.value}
                  onChange={(e) => setProp(i, 'value', e.target.value)}
                />
                <button
                  onClick={() => removeProp(i)}
                  className="text-xs text-red-500 hover:text-red-400"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={creating ? submitCreate : submitEdit}
              disabled={!form.name.trim()}
              className="flex-1 rounded bg-emerald-700 px-2 py-1 text-xs hover:bg-emerald-600 disabled:opacity-40"
            >
              {creating ? 'Create' : 'Save'}
            </button>
            <button
              onClick={cancelEdit}
              className="flex-1 rounded bg-slate-700 px-2 py-1 text-xs hover:bg-slate-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared sub-panels
// ---------------------------------------------------------------------------

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
          <button onClick={() => onChange('')} className="text-xs text-slate-400 hover:text-slate-200">
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

function EquipmentPanel({
  element,
  items,
  onChange,
}: {
  element: GameElement;
  items: Item[];
  onChange: (id: string, patch: Partial<GameElement>) => void;
}) {
  const equippedItem = items.find((i) => i.id === element.equippedItemId);
  // Combat items (weapons + spells) are those with a range or attackType.
  const combatItems = items.filter((i) => i.attackType || (i.range ?? 0) > 0);
  const options = combatItems.length > 0 ? combatItems : items;

  return (
    <div className="flex flex-col gap-2 rounded bg-slate-800/50 p-2">
      <span className="text-sm font-semibold text-slate-300">Equipment</span>
      <Field label="Equipped weapon / spell (attack range)">
        <select
          className="w-full rounded bg-slate-800 px-2 py-1 text-sm"
          value={element.equippedItemId ?? ''}
          // Send '' (not undefined) so the server actually clears it — socket.io
          // drops undefined keys, which is why deselecting used to do nothing.
          onChange={(e) => onChange(element.id, { equippedItemId: e.target.value })}
        >
          <option value="">— none —</option>
          {options.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
      </Field>
      {equippedItem && (
        <p className="flex items-center gap-2 text-xs text-slate-400">
          {equippedItem.color && (
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: equippedItem.color }}
            />
          )}
          <span>
            {equippedItem.attackType ?? 'item'}
            {equippedItem.damage ? ` · ${equippedItem.damage}` : ''}
            {equippedItem.range ? ` · range ${equippedItem.range}` : ''}
            {equippedItem.areaType && equippedItem.areaType !== 'single'
              ? ` · ${equippedItem.areaType}${equippedItem.areaSize ? ` ${equippedItem.areaSize}` : ''}`
              : ''}
          </span>
        </p>
      )}
    </div>
  );
}

function InventoryPanel({
  element,
  items,
  mapItems,
  onChange,
  onDrop,
  onPickup,
}: {
  element: GameElement;
  items: Item[];
  mapItems: GameElement[];
  onChange: (id: string, patch: Partial<GameElement>) => void;
  onDrop: (elementId: string, itemId: string) => void;
  onPickup: (elementId: string, itemElementId: string) => void;
}) {
  const [toAdd, setToAdd] = useState('');

  return (
    <div className="flex flex-col gap-2 rounded bg-slate-800/50 p-2">
      <span className="text-sm font-semibold text-slate-300">Inventory</span>
      {element.inventory.length === 0 && <p className="text-xs text-slate-500">Empty.</p>}

      <ul className="flex flex-col gap-1">
        {element.inventory.map((id, idx) => {
          const item = items.find((i) => i.id === id);
          return (
            <li
              key={`${id}-${idx}`}
              className="flex items-center justify-between gap-1 rounded bg-slate-800 px-2 py-1 text-sm"
            >
              {item?.color && (
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
              )}
              <span className="flex-1 truncate">{item?.name ?? id}</span>
              <span className="flex shrink-0 gap-1">
                {(item?.attackType || (item?.range ?? 0) > 0) && (
                  <button
                    onClick={() => onChange(element.id, { equippedItemId: id })}
                    className="rounded bg-emerald-700 px-2 text-xs hover:bg-emerald-600"
                  >
                    Equip
                  </button>
                )}
                <button
                  onClick={() => onDrop(element.id, id)}
                  className="rounded bg-slate-700 px-2 text-xs hover:bg-slate-600"
                >
                  Drop
                </button>
                <button
                  onClick={() =>
                    onChange(element.id, { inventory: element.inventory.filter((_, i) => i !== idx) })
                  }
                  className="rounded px-1 text-xs text-slate-400 hover:text-slate-200"
                >
                  ✕
                </button>
              </span>
            </li>
          );
        })}
      </ul>

      <div className="flex gap-1">
        <select
          className="flex-1 rounded bg-slate-800 px-1 py-1 text-xs"
          value={toAdd}
          onChange={(e) => setToAdd(e.target.value)}
        >
          <option value="">Add item…</option>
          {items.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
        <button
          disabled={!toAdd}
          onClick={() => {
            if (!toAdd) return;
            onChange(element.id, { inventory: [...element.inventory, toAdd] });
            setToAdd('');
          }}
          className="rounded bg-slate-700 px-2 text-xs hover:bg-slate-600 disabled:opacity-40"
        >
          Add
        </button>
      </div>

      {mapItems.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-xs text-slate-400">On the map</span>
          {mapItems.map((mi) => (
            <div
              key={mi.id}
              className="flex items-center justify-between rounded bg-slate-800 px-2 py-1 text-xs"
            >
              <span className="truncate">{mi.name}</span>
              <button
                onClick={() => onPickup(element.id, mi.id)}
                className="shrink-0 rounded bg-emerald-700 px-2 hover:bg-emerald-600"
              >
                Pick up
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
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
