import { describe, expect, it } from 'vitest';
import type { Obstacle } from '@dnd/shared';
import { isCellBlockedByObstacles, movementBlockedCells, pointInObstacle } from './obstacles.js';

const map = { width: 500, height: 500, gridSize: 50 }; // 10x10 cells

const rect = (type: Obstacle['type'], a: [number, number], b: [number, number]): Obstacle => ({
  id: 'o',
  mapId: 'm',
  type,
  shape: 'rectangle',
  points: [
    { x: a[0], y: a[1] },
    { x: b[0], y: b[1] },
  ],
});

describe('pointInObstacle', () => {
  it('detects points inside / outside a rectangle', () => {
    const o = rect('blocks_movement', [100, 100], [200, 200]);
    expect(pointInObstacle({ x: 150, y: 150 }, o)).toBe(true);
    expect(pointInObstacle({ x: 250, y: 150 }, o)).toBe(false);
  });

  it('detects points inside a circle', () => {
    const o: Obstacle = {
      id: 'o', mapId: 'm', type: 'blocks_both', shape: 'circle',
      points: [{ x: 100, y: 100 }, { x: 150, y: 100 }], // radius 50
    };
    expect(pointInObstacle({ x: 120, y: 100 }, o)).toBe(true);
    expect(pointInObstacle({ x: 160, y: 100 }, o)).toBe(false);
  });

  it('detects points inside a polygon (triangle)', () => {
    const o: Obstacle = {
      id: 'o', mapId: 'm', type: 'blocks_movement', shape: 'polygon',
      points: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 0, y: 100 }],
    };
    expect(pointInObstacle({ x: 10, y: 10 }, o)).toBe(true);
    expect(pointInObstacle({ x: 90, y: 90 }, o)).toBe(false);
  });
});

describe('isCellBlockedByObstacles', () => {
  it('blocks cells whose center is inside a movement obstacle', () => {
    const obstacles = [rect('blocks_movement', [100, 100], [199, 199])];
    // cell (3,3) center = (175,175) is inside; (5,5) center = (275,275) is outside
    expect(isCellBlockedByObstacles({ col: 3, row: 3 }, map, obstacles)).toBe(true);
    expect(isCellBlockedByObstacles({ col: 5, row: 5 }, map, obstacles)).toBe(false);
  });

  it('ignores vision-only obstacles for movement', () => {
    const obstacles = [rect('blocks_vision', [100, 100], [400, 400])];
    expect(isCellBlockedByObstacles({ col: 4, row: 4 }, map, obstacles)).toBe(false);
  });
});

describe('movementBlockedCells', () => {
  it('returns empty when there are no movement obstacles', () => {
    expect(movementBlockedCells(map, [rect('blocks_vision', [0, 0], [500, 500])])).toEqual([]);
  });

  it('rasterizes a rectangle to the covered cells', () => {
    // covers cell centers at 75 and 125 (cols/rows 1 and 2) => 2x2 block
    const cells = movementBlockedCells(map, [rect('blocks_both', [60, 60], [140, 140])]);
    expect(cells).toHaveLength(4);
  });
});
