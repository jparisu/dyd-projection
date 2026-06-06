import type { Cell, GameMap, Point } from '@dnd/shared';

/** Just the grid-defining fields; `gridType` defaults to square when omitted. */
export type GridSpec = { gridSize: number; gridType?: GameMap['gridType'] };
type MapDims = { width: number; height: number; gridSize: number; gridType?: GameMap['gridType'] };

const SQRT3 = Math.sqrt(3);

// We use pointy-top hexes in an "odd-r" offset layout (odd rows shifted right).
// `gridSize` is treated as the hex *width*, so square and hex cells of the same
// gridSize look similarly scaled. The circumradius follows from that width.
const hexRadius = (gridSize: number): number => gridSize / SQRT3;

/** Center pixel position of a cell. */
export function cellToPoint(cell: Cell, grid: GridSpec): Point {
  const { gridSize } = grid;
  if (grid.gridType === 'hex') {
    const size = hexRadius(gridSize);
    return {
      x: gridSize / 2 + gridSize * cell.col + (cell.row & 1 ? gridSize / 2 : 0),
      y: size + 1.5 * size * cell.row,
    };
  }
  return {
    x: cell.col * gridSize + gridSize / 2,
    y: cell.row * gridSize + gridSize / 2,
  };
}

/** Convert a pixel position to the cell that contains it. */
export function pointToCell(point: Point, grid: GridSpec): Cell {
  const { gridSize } = grid;
  if (grid.gridType === 'hex') {
    const size = hexRadius(gridSize);
    const px = point.x - gridSize / 2;
    const py = point.y - size;
    const q = ((SQRT3 / 3) * px - (1 / 3) * py) / size;
    const r = ((2 / 3) * py) / size;
    const rounded = axialRound(q, r);
    return { col: rounded.q + (rounded.r - (rounded.r & 1)) / 2, row: rounded.r };
  }
  return {
    col: Math.floor(point.x / gridSize),
    row: Math.floor(point.y / gridSize),
  };
}

/** Round fractional axial hex coordinates to the nearest hex. */
function axialRound(q: number, r: number): { q: number; r: number } {
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  const rs = Math.round(s);
  const dq = Math.abs(rq - q);
  const dr = Math.abs(rr - r);
  const ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;
  return { q: rq, r: rr };
}

/** The 6 corner points of a pointy-top hexagon centered at `center`. */
export function hexCorners(center: Point, gridSize: number): Point[] {
  const size = hexRadius(gridSize);
  const corners: Point[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    corners.push({ x: center.x + size * Math.cos(angle), y: center.y + size * Math.sin(angle) });
  }
  return corners;
}

export function cellKey(cell: Cell): string {
  return `${cell.col},${cell.row}`;
}

export function dimensionsInCells(map: MapDims): { cols: number; rows: number } {
  if (map.gridType === 'hex') {
    const size = hexRadius(map.gridSize);
    return {
      cols: Math.ceil(map.width / map.gridSize) + 1,
      rows: Math.ceil((map.height - size) / (1.5 * size)) + 1,
    };
  }
  return {
    cols: Math.ceil(map.width / map.gridSize),
    rows: Math.ceil(map.height / map.gridSize),
  };
}

// odd-r offset neighbour deltas (Δcol, Δrow), indexed by row parity.
const ODDR_NEIGHBORS: readonly (readonly [number, number])[][] = [
  // even rows
  [
    [1, 0],
    [0, -1],
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, 1],
  ],
  // odd rows
  [
    [1, 0],
    [1, -1],
    [0, -1],
    [-1, 0],
    [0, 1],
    [1, 1],
  ],
];

/**
 * Neighbours of a cell. Square grids (and the continuous fallback) use 8-way
 * movement; hex grids use the 6 odd-r offset neighbours.
 */
export function neighbours(cell: Cell, gridType: GameMap['gridType']): Cell[] {
  if (gridType === 'hex') {
    return ODDR_NEIGHBORS[cell.row & 1].map(([dc, dr]) => ({
      col: cell.col + dc,
      row: cell.row + dr,
    }));
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
