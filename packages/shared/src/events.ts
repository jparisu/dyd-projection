import { z } from 'zod';
import { PointSchema } from './geometry.js';
import {
  GameElementSchema,
  GameMapSchema,
  InitiativeEntrySchema,
  ObstacleSchema,
  SessionStateSchema,
  VisibilityModeSchema,
} from './schemas.js';

// ---------------------------------------------------------------------------
// Socket.IO event contract. `ClientToServerEvents` / `ServerToClientEvents`
// are consumed by both `socket.io` (server) and `socket.io-client` (web) to
// get end-to-end type safety on every emit/handler.
// ---------------------------------------------------------------------------

/** Role a connection plays — drives what the server is willing to send/accept. */
export const ClientRoleSchema = z.enum(['dm', 'projector']);
export type ClientRole = z.infer<typeof ClientRoleSchema>;

// ---- Client -> Server payloads -------------------------------------------

export const SessionJoinSchema = z.object({
  sessionId: z.string(),
  role: ClientRoleSchema,
});
export type SessionJoin = z.infer<typeof SessionJoinSchema>;

export const TokenCreateSchema = GameElementSchema.partial({
  id: true,
  sessionId: true,
}).extend({
  mapId: z.string(),
  position: PointSchema,
});
export type TokenCreate = z.infer<typeof TokenCreateSchema>;
/** What a client actually sends — fields with schema defaults are optional. */
export type TokenCreateInput = z.input<typeof TokenCreateSchema>;

export const TokenUpdateSchema = z.object({
  id: z.string(),
  patch: GameElementSchema.partial().omit({ id: true, sessionId: true }),
});
export type TokenUpdate = z.infer<typeof TokenUpdateSchema>;

export const TokenMoveSchema = z.object({
  id: z.string(),
  position: PointSchema,
});
export type TokenMove = z.infer<typeof TokenMoveSchema>;

export const TokenIdSchema = z.object({ id: z.string() });
export type TokenId = z.infer<typeof TokenIdSchema>;

export const MapSelectSchema = z.object({ mapId: z.string() });

/** A single obstacle as authored in a file / sent by a client (no id/mapId). */
export const ObstacleInputSchema = ObstacleSchema.omit({ id: true, mapId: true });
export type ObstacleInput = z.input<typeof ObstacleInputSchema>;

/** Bulk-replace the obstacles of a map (e.g. after loading an obstacle file). */
export const ObstaclesSetSchema = z.object({
  mapId: z.string(),
  obstacles: z.array(ObstacleInputSchema),
});
export type ObstaclesSet = z.input<typeof ObstaclesSetSchema>;

/** Accepted shapes of an uploaded obstacle file: a bare array or `{ obstacles }`. */
export const ObstacleFileSchema = z.union([
  z.array(ObstacleInputSchema),
  z.object({ obstacles: z.array(ObstacleInputSchema) }),
]);
export const VisibilitySetSchema = z.object({ mode: VisibilityModeSchema });
export const PopupSchema = z.object({
  title: z.string().optional(),
  message: z.string(),
});
export type Popup = z.infer<typeof PopupSchema>;

// ---- Typed socket interfaces ---------------------------------------------

export interface ClientToServerEvents {
  'session:join': (payload: z.infer<typeof SessionJoinSchema>) => void;
  'map:select': (payload: z.infer<typeof MapSelectSchema>) => void;
  'token:create': (payload: z.input<typeof TokenCreateSchema>) => void;
  'token:update': (payload: z.infer<typeof TokenUpdateSchema>) => void;
  'token:move': (payload: z.infer<typeof TokenMoveSchema>) => void;
  'token:delete': (payload: z.infer<typeof TokenIdSchema>) => void;
  'token:select': (payload: z.infer<typeof TokenIdSchema>) => void;
  'obstacle:create': (payload: z.infer<typeof ObstacleSchema>) => void;
  'obstacle:delete': (payload: z.infer<typeof TokenIdSchema>) => void;
  'obstacles:set': (payload: z.input<typeof ObstaclesSetSchema>) => void;
  'initiative:update': (payload: z.infer<typeof InitiativeEntrySchema>[]) => void;
  'initiative:next-turn': () => void;
  'visibility:set-mode': (payload: z.infer<typeof VisibilitySetSchema>) => void;
  'dm:send-popup': (payload: z.infer<typeof PopupSchema>) => void;
}

export interface ServerToClientEvents {
  'session:state': (state: z.infer<typeof SessionStateSchema>) => void;
  'map:updated': (map: z.infer<typeof GameMapSchema>) => void;
  'token:created': (element: z.infer<typeof GameElementSchema>) => void;
  'token:updated': (element: z.infer<typeof GameElementSchema>) => void;
  'token:moved': (payload: z.infer<typeof TokenMoveSchema>) => void;
  'token:deleted': (payload: z.infer<typeof TokenIdSchema>) => void;
  'token:selected': (payload: z.infer<typeof TokenIdSchema>) => void;
  'initiative:updated': (entries: z.infer<typeof InitiativeEntrySchema>[]) => void;
  'visibility:updated': (payload: z.infer<typeof VisibilitySetSchema>) => void;
  'dm:popup': (payload: z.infer<typeof PopupSchema>) => void;
  error: (payload: { message: string }) => void;
}
