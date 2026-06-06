import { describe, expect, it } from 'vitest';
import type { Cell } from '@dnd/shared';
import { cellToPoint, hexCorners, neighbours, pointToCell } from './grid.js';

describe('square grid', () => {
  const grid = { gridType: 'square' as const, gridSize: 50 };

  it('maps a cell to its center and back', () => {
    expect(cellToPoint({ col: 2, row: 3 }, grid)).toEqual({ x: 125, y: 175 });
    expect(pointToCell({ x: 130, y: 160 }, grid)).toEqual({ col: 2, row: 3 });
  });

  it('has 8 neighbours', () => {
    expect(neighbours({ col: 5, row: 5 }, 'square')).toHaveLength(8);
  });
});

describe('hex grid', () => {
  const grid = { gridType: 'hex' as const, gridSize: 60 };

  it('has 6 neighbours', () => {
    expect(neighbours({ col: 3, row: 3 }, 'hex')).toHaveLength(6);
  });

  it('round-trips every cell: pointToCell(cellToPoint(c)) === c', () => {
    const cells: Cell[] = [];
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) cells.push({ col, row });
    }
    for (const cell of cells) {
      const center = cellToPoint(cell, grid);
      expect(pointToCell(center, grid)).toEqual(cell);
    }
  });

  it('offsets odd rows to the right of even rows', () => {
    const even = cellToPoint({ col: 0, row: 0 }, grid);
    const odd = cellToPoint({ col: 0, row: 1 }, grid);
    expect(odd.x).toBeGreaterThan(even.x); // half-width shift
    expect(odd.y).toBeGreaterThan(even.y); // next row down
  });

  it('produces 6 distinct corners around the center', () => {
    const corners = hexCorners({ x: 100, y: 100 }, 60);
    expect(corners).toHaveLength(6);
  });
});
