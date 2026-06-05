import type { Cell, GameMap, Point } from '@dnd/shared';

/**
 * Convert a pixel position to the cell that contains it. For continuous maps
 * we still snap to a notional grid so movement math has integer coordinates;
 * callers that want true continuous movement can ignore the grid helpers.
 */
export function pointToCell(point: Point, gridSize: number): Cell {
  return {
    col: Math.floor(point.x / gridSize),
    row: Math.floor(point.y / gridSize),
  };
}

/** Center pixel position of a cell. */
export function cellToPoint(cell: Cell, gridSize: number): Point {
  return {
    x: cell.col * gridSize + gridSize / 2,
    y: cell.row * gridSize + gridSize / 2,
  };
}

export function cellKey(cell: Cell): string {
  return `${cell.col},${cell.row}`;
}

export function dimensionsInCells(map: Pick<GameMap, 'width' | 'height' | 'gridSize'>): {
  cols: number;
  rows: number;
} {
  return {
    cols: Math.ceil(map.width / map.gridSize),
    rows: Math.ceil(map.height / map.gridSize),
  };
}

/**
 * Neighbours of a cell. Square grids use 8-way movement; hex grids use the
 * 6 axial neighbours (odd-row offset layout). Continuous maps reuse the
 * square neighbourhood for range estimation.
 */
export function neighbours(cell: Cell, gridType: GameMap['gridType']): Cell[] {
  if (gridType === 'hex') {
    const even = cell.row % 2 === 0;
    const deltas = even
      ? [
          [-1, 0],
          [1, 0],
          [0, -1],
          [-1, -1],
          [0, 1],
          [-1, 1],
        ]
      : [
          [-1, 0],
          [1, 0],
          [1, -1],
          [0, -1],
          [1, 1],
          [0, 1],
        ];
    return deltas.map(([dc, dr]) => ({ col: cell.col + dc, row: cell.row + dr }));
  }

  const result: Cell[] = [];
  for (let dc = -1; dc <= 1; dc++) {
    for (let dr = -1; dr <= 1; dr++) {
      if (dc === 0 && dr === 0) continue;
      result.push({ col: cell.col + dc, row: cell.row + dr });
    }
  }
  return result;
}
