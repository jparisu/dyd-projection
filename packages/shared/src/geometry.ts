import { z } from 'zod';

export const PointSchema = z.object({
  x: z.number(),
  y: z.number(),
});
export type Point = z.infer<typeof PointSchema>;

/** A cell coordinate on a discrete grid (square or hex). */
export const CellSchema = z.object({
  col: z.number().int(),
  row: z.number().int(),
});
export type Cell = z.infer<typeof CellSchema>;
