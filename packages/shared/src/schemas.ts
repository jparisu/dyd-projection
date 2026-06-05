import { z } from 'zod';
import { PointSchema } from './geometry.js';

// ---------------------------------------------------------------------------
// Core game entities. Schemas are the single source of truth; types are
// inferred from them so server validation and TS types never drift apart.
// ---------------------------------------------------------------------------

export const GridTypeSchema = z.enum(['square', 'hex', 'continuous']);
export type GridType = z.infer<typeof GridTypeSchema>;

export const VisibilityModeSchema = z.enum(['all', 'fog_of_war']);
export type VisibilityMode = z.infer<typeof VisibilityModeSchema>;

export const ElementTypeSchema = z.enum([
  'player',
  'monster',
  'npc',
  'item',
  'object',
  'trap',
]);
export type ElementType = z.infer<typeof ElementTypeSchema>;

export const StatValueSchema = z.union([z.number(), z.string(), z.boolean()]);

export const ObstacleSchema = z.object({
  id: z.string(),
  mapId: z.string(),
  type: z.enum(['blocks_movement', 'blocks_vision', 'blocks_both']),
  shape: z.enum(['polygon', 'line', 'rectangle', 'circle']),
  points: z.array(PointSchema),
});
export type Obstacle = z.infer<typeof ObstacleSchema>;

export const GameMapSchema = z.object({
  id: z.string(),
  campaignId: z.string(),
  name: z.string(),
  imageUrl: z.string(),
  width: z.number().positive(),
  height: z.number().positive(),
  gridType: GridTypeSchema,
  gridSize: z.number().positive(),
  obstacles: z.array(ObstacleSchema).default([]),
});
export type GameMap = z.infer<typeof GameMapSchema>;

export const WeaponSchema = z.object({
  id: z.string(),
  name: z.string(),
  range: z.number().nonnegative(),
  damage: z.string(),
  attackType: z.enum(['melee', 'ranged']),
  properties: z.array(z.string()).default([]),
});
export type Weapon = z.infer<typeof WeaponSchema>;

export const SpellSchema = z.object({
  id: z.string(),
  name: z.string(),
  range: z.number().nonnegative(),
  areaType: z.enum(['single', 'cone', 'sphere', 'line', 'cube']).optional(),
  areaSize: z.number().nonnegative().optional(),
  description: z.string().default(''),
});
export type Spell = z.infer<typeof SpellSchema>;

export const GameElementSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  mapId: z.string(),
  type: ElementTypeSchema,
  name: z.string(),
  iconUrl: z.string().optional(),
  position: PointSchema,
  size: z.number().positive().default(1),
  visibleToPlayers: z.boolean().default(true),
  stats: z.record(StatValueSchema).default({}),
  equippedWeaponId: z.string().optional(),
  selectedSpellId: z.string().optional(),
});
export type GameElement = z.infer<typeof GameElementSchema>;

export const InitiativeEntrySchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  elementId: z.string(),
  initiative: z.number(),
  order: z.number().int(),
  hasActed: z.boolean().default(false),
});
export type InitiativeEntry = z.infer<typeof InitiativeEntrySchema>;

export const CampaignSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Campaign = z.infer<typeof CampaignSchema>;

export const GameSessionSchema = z.object({
  id: z.string(),
  campaignId: z.string(),
  name: z.string(),
  activeMapId: z.string().optional(),
  visibilityMode: VisibilityModeSchema.default('all'),
  currentTurnElementId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type GameSession = z.infer<typeof GameSessionSchema>;

/**
 * The full snapshot a client needs to render a session. Sent on join and
 * whenever a coarse-grained resync is required. Fine-grained updates use the
 * dedicated socket events in events.ts.
 */
export const SessionStateSchema = z.object({
  session: GameSessionSchema,
  maps: z.array(GameMapSchema),
  elements: z.array(GameElementSchema),
  initiative: z.array(InitiativeEntrySchema),
  weapons: z.array(WeaponSchema),
  spells: z.array(SpellSchema),
});
export type SessionState = z.infer<typeof SessionStateSchema>;
