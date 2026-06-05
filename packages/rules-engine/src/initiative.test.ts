import { describe, expect, it } from 'vitest';
import type { InitiativeEntry } from '@dnd/shared';
import { nextTurn, sortInitiative } from './initiative.js';

const entry = (elementId: string, initiative: number): InitiativeEntry => ({
  id: `ini-${elementId}`,
  sessionId: 's',
  elementId,
  initiative,
  order: 0,
  hasActed: false,
});

describe('sortInitiative', () => {
  it('orders by initiative descending and reassigns order', () => {
    const sorted = sortInitiative([entry('a', 10), entry('b', 20), entry('c', 15)]);
    expect(sorted.map((e) => e.elementId)).toEqual(['b', 'c', 'a']);
    expect(sorted.map((e) => e.order)).toEqual([0, 1, 2]);
  });

  it('does not mutate the input array', () => {
    const input = [entry('a', 10), entry('b', 20)];
    sortInitiative(input);
    expect(input.map((e) => e.elementId)).toEqual(['a', 'b']);
  });
});

describe('nextTurn', () => {
  const entries = [entry('a', 20), entry('b', 15), entry('c', 10)];

  it('advances to the next element in order', () => {
    const result = nextTurn(entries, 'a');
    expect(result.currentElementId).toBe('b');
  });

  it('wraps to the top and clears hasActed on a new round', () => {
    const acted = entries.map((e) => ({ ...e, hasActed: true }));
    const result = nextTurn(acted, 'c');
    expect(result.currentElementId).toBe('a');
    expect(result.entries.every((e) => e.hasActed === false)).toBe(true);
  });

  it('starts at the top when no current turn is set', () => {
    const result = nextTurn(entries, undefined);
    expect(result.currentElementId).toBe('a');
  });

  it('returns undefined for an empty tracker', () => {
    const result = nextTurn([], 'a');
    expect(result.currentElementId).toBeUndefined();
  });
});
