import type { Cell, GameMap, Obstacle, Point } from '@dnd/shared';
import { cellToPoint, dimensionsInCells } from './grid.js';

type MapDims = Pick<GameMap, 'width' | 'height' | 'gridSize'>;

export function obstacleBlocksMovement(o: Obstacle): boolean {
  return o.type === 'blocks_movement' || o.type === 'blocks_both';
}

export function obstacleBlocksVision(o: Obstacle): boolean {
  return o.type === 'blocks_vision' || o.type === 'blocks_both';
}

/** Bounding box of a shape's points (handles rectangles given as 2+ corners). */
function bounds(points: Point[]): { minX: number; minY: number; maxX: number; maxY: number } {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

/** Ray-casting point-in-polygon test (pixel space). */
function pointInPolygon(point: Point, poly: Point[]): boolean {
  if (poly.length < 3) return false;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const { x: xi, y: yi } = poly[i];
    const { x: xj, y: yj } = poly[j];
    const intersects =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

/** Is a pixel-space point inside the given obstacle shape? */
export function pointInObstacle(point: Point, o: Obstacle): boolean {
  if (o.points.length === 0) return false;
  switch (o.shape) {
    case 'rectangle': {
      if (o.points.length < 2) return false;
      const b = bounds(o.points);
      return point.x >= b.minX && point.x <= b.maxX && point.y >= b.minY && point.y <= b.maxY;
    }
    case 'circle': {
      if (o.points.length < 2) return false;
      const [c, edge] = o.points;
      const r = Math.hypot(edge.x - c.x, edge.y - c.y);
      return Math.hypot(point.x - c.x, point.y - c.y) <= r;
    }
    case 'polygon':
    case 'line':
    default:
      return pointInPolygon(point, o.points);
  }
}

/**
 * True if a grid cell's center sits inside any movement-blocking obstacle.
 * Used both to reject drops and to exclude cells from movement range.
 */
export function isCellBlockedByObstacles(cell: Cell, map: MapDims, obstacles: Obstacle[]): boolean {
  const center = cellToPoint(cell, map.gridSize);
  return obstacles.some((o) => obstacleBlocksMovement(o) && pointInObstacle(center, o));
}

/** Every cell whose center sits inside a movement-blocking obstacle. */
export function movementBlockedCells(map: MapDims, obstacles: Obstacle[]): Cell[] {
  const movers = obstacles.filter(obstacleBlocksMovement);
  if (movers.length === 0) return [];
  const { cols, rows } = dimensionsInCells(map);
  const cells: Cell[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const center = cellToPoint({ col, row }, map.gridSize);
      if (movers.some((o) => pointInObstacle(center, o))) cells.push({ col, row });
    }
  }
  return cells;
}
