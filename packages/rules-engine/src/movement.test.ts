import { describe, expect, it } from 'vitest';
import type { Cell } from '@dnd/shared';
import { cellKey } from './grid.js';
import { reachableCells } from './movement.js';

const map = { gridType: 'square' as const, width: 500, height: 500, gridSize: 50 };
// => 10x10 cell grid

const has = (cells: Cell[], col: number, row: number) =>
  cells.some((c) => c.col === col && c.row === row);

describe('reachableCells (square grid, 8-way)', () => {
  it('reaches the surrounding ring at range 1', () => {
    const cells = reachableCells({ col: 5, row: 5 }, { map, blocked: [], range: 1 });
    expect(cells).toHaveLength(8); // 8 neighbours, start excluded
    expect(has(cells, 5, 5)).toBe(false);
    expect(has(cells, 4, 4)).toBe(true);
    expect(has(cells, 6, 6)).toBe(true);
  });

  it('expands to 24 cells at range 2 in open ground', () => {
    const cells = reachableCells({ col: 5, row: 5 }, { map, blocked: [], range: 2 });
    expect(cells).toHaveLength(24); // 5x5 block minus the start cell
  });

  it('never returns out-of-bounds cells', () => {
    const cells = reachableCells({ col: 0, row: 0 }, { map, blocked: [], range: 3 });
    expect(cells.every((c) => c.col >= 0 && c.row >= 0)).toBe(true);
  });

  it('cannot escape when fully surrounded by blocked cells', () => {
    const blocked: Cell[] = [
      { col: 4, row: 4 }, { col: 5, row: 4 }, { col: 6, row: 4 },
      { col: 4, row: 5 }, { col: 6, row: 5 },
      { col: 4, row: 6 }, { col: 5, row: 6 }, { col: 6, row: 6 },
    ];
    const cells = reachableCells({ col: 5, row: 5 }, { map, blocked, range: 5 });
    expect(cells).toHaveLength(0);
  });

  it('cannot move through a wall of blocked cells', () => {
    // Vertical wall at col 6 blocks passage to the right half.
    const wall: Cell[] = Array.from({ length: 10 }, (_, row) => ({ col: 6, row }));
    const cells = reachableCells({ col: 5, row: 5 }, { map, blocked: wall, range: 5 });
    const keys = new Set(cells.map(cellKey));
    expect(keys.has(cellKey({ col: 7, row: 5 }))).toBe(false); // beyond the wall
    expect(keys.has(cellKey({ col: 6, row: 5 }))).toBe(false); // the wall itself
    expect(keys.has(cellKey({ col: 5, row: 0 }))).toBe(true); // left half still open
  });
});
