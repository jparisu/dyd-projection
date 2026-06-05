import type { InitiativeEntry } from '@dnd/shared';

/** Sort by initiative descending, assigning a stable 0-based `order`. */
export function sortInitiative(entries: InitiativeEntry[]): InitiativeEntry[] {
  return [...entries]
    .sort((a, b) => b.initiative - a.initiative)
    .map((entry, index) => ({ ...entry, order: index }));
}

/**
 * Element whose turn comes after `currentElementId`. Wraps around to the top
 * of the order and clears `hasActed` when a new round begins.
 */
export function nextTurn(
  entries: InitiativeEntry[],
  currentElementId: string | undefined,
): { entries: InitiativeEntry[]; currentElementId: string | undefined } {
  const ordered = sortInitiative(entries);
  if (ordered.length === 0) return { entries: ordered, currentElementId: undefined };

  const currentIndex = ordered.findIndex((e) => e.elementId === currentElementId);
  const nextIndex = (currentIndex + 1) % ordered.length;
  const wrapped = nextIndex === 0 && currentIndex !== -1;

  const updated = ordered.map((e, i) => ({
    ...e,
    hasActed: wrapped ? false : e.hasActed || i === currentIndex,
  }));

  return { entries: updated, currentElementId: ordered[nextIndex].elementId };
}
