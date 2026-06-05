import type { Cell, GameMap } from '@dnd/shared';
import { cellKey, dimensionsInCells, neighbours } from './grid.js';

export interface MovementOptions {
  /** Map providing grid type and dimensions. */
  map: Pick<GameMap, 'gridType' | 'width' | 'height' | 'gridSize'>;
  /** Cells that cannot be entered (movement-blocking obstacles, occupants). */
  blocked: Iterable<Cell>;
  /** Movement budget in cells. */
  range: number;
}

/**
 * Reachable cells from `start` within `range` steps, treating each step as
 * cost 1 (BFS). Blocked cells are impassable. This is the Phase 5 movement
 * range primitive; weighted terrain can later swap BFS for Dijkstra.
 */
export function reachableCells(start: Cell, options: MovementOptions): Cell[] {
  const { map, range } = options;
  const { cols, rows } = dimensionsInCells(map);

  const blockedSet = new Set<string>();
  for (const cell of options.blocked) blockedSet.add(cellKey(cell));

  const inBounds = (c: Cell) => c.col >= 0 && c.row >= 0 && c.col < cols && c.row < rows;

  const visited = new Set<string>([cellKey(start)]);
  const reachable: Cell[] = [];
  let frontier: Cell[] = [start];

  for (let step = 0; step < range; step++) {
    const next: Cell[] = [];
    for (const cell of frontier) {
      for (const n of neighbours(cell, map.gridType)) {
        const key = cellKey(n);
        if (visited.has(key) || blockedSet.has(key) || !inBounds(n)) continue;
        visited.add(key);
        reachable.push(n);
        next.push(n);
      }
    }
    frontier = next;
    if (frontier.length === 0) break;
  }

  return reachable;
}
