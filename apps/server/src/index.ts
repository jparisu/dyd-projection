import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { extname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import multipart from '@fastify/multipart';
import { Server as SocketServer } from 'socket.io';
import {
  DEFAULT_SERVER_PORT,
  InitiativeEntrySchema,
  MapSelectSchema,
  ObstaclesSetSchema,
  PopupSchema,
  SessionJoinSchema,
  TokenCreateSchema,
  TokenIdSchema,
  TokenMoveSchema,
  TokenUpdateSchema,
  VisibilitySetSchema,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from '@dnd/shared';
import { nextTurn, sortInitiative } from '@dnd/rules-engine';
import { z } from 'zod';
import { SessionStore } from './store.js';

const PORT = Number(process.env.PORT ?? DEFAULT_SERVER_PORT);
const UPLOADS_DIR = join(process.cwd(), 'uploads');
await mkdir(UPLOADS_DIR, { recursive: true });

const store = new SessionStore();

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });
await app.register(multipart, { limits: { fileSize: 25 * 1024 * 1024 } });
await app.register(fastifyStatic, { root: UPLOADS_DIR, prefix: '/uploads/' });

app.get('/health', async () => ({ status: 'ok', uptime: process.uptime() }));

/**
 * Map background upload. Stores the image under /uploads and broadcasts the new
 * map (with its `imageUrl`) to every client in the session so DM + projector
 * load the same picture.
 */
app.post<{ Params: { sessionId: string; mapId: string } }>(
  '/api/sessions/:sessionId/maps/:mapId/image',
  async (req, reply) => {
    const { sessionId, mapId } = req.params;
    const file = await req.file();
    if (!file) return reply.code(400).send({ error: 'No file uploaded.' });

    const ext = (extname(file.filename) || '.png').toLowerCase();
    const filename = `${mapId}-${randomUUID()}${ext}`;
    await pipeline(file.file, createWriteStream(join(UPLOADS_DIR, filename)));

    const imageUrl = `/uploads/${filename}`;
    const map = store.setMapImage(sessionId, mapId, imageUrl);
    if (!map) return reply.code(404).send({ error: 'Map not found.' });

    io.to(sessionId).emit('map:updated', map);
    return { imageUrl };
  },
);

/** Generic image upload (e.g. token icons). Returns the served URL. */
app.post('/api/uploads', async (req, reply) => {
  const file = await req.file();
  if (!file) return reply.code(400).send({ error: 'No file uploaded.' });
  const ext = (extname(file.filename) || '.png').toLowerCase();
  const filename = `upload-${randomUUID()}${ext}`;
  await pipeline(file.file, createWriteStream(join(UPLOADS_DIR, filename)));
  return { url: `/uploads/${filename}` };
});

const io = new SocketServer<ClientToServerEvents, ServerToClientEvents>(app.server, {
  cors: { origin: true },
});

/** Per-connection state we attach without polluting the socket types. */
interface ConnContext {
  sessionId?: string;
  role?: 'dm' | 'projector';
}
const contexts = new WeakMap<object, ConnContext>();

io.on('connection', (socket) => {
  contexts.set(socket, {});
  app.log.info({ id: socket.id }, 'socket connected');

  /** Run a handler with a parsed+validated payload; report parse errors. */
  const guarded =
    <S extends z.ZodTypeAny>(
      schema: S,
      requireDm: boolean,
      handler: (payload: z.output<S>, ctx: ConnContext) => void,
    ) =>
    (raw: unknown) => {
      const ctx = contexts.get(socket) ?? {};
      if (requireDm && ctx.role !== 'dm') {
        socket.emit('error', { message: 'Only the DM can perform this action.' });
        return;
      }
      const parsed = schema.safeParse(raw);
      if (!parsed.success) {
        socket.emit('error', { message: `Invalid payload: ${parsed.error.message}` });
        return;
      }
      handler(parsed.data, ctx);
    };

  socket.on(
    'session:join',
    guarded(SessionJoinSchema, false, ({ sessionId, role }, ctx) => {
      ctx.sessionId = sessionId;
      ctx.role = role;
      contexts.set(socket, ctx);
      void socket.join(sessionId);
      socket.emit('session:state', store.getOrCreate(sessionId));
    }),
  );

  socket.on(
    'map:select',
    guarded(MapSelectSchema, true, ({ mapId }, ctx) => {
      if (!ctx.sessionId) return;
      store.setActiveMap(ctx.sessionId, mapId);
      io.to(ctx.sessionId).emit('session:state', store.getOrCreate(ctx.sessionId));
    }),
  );

  socket.on(
    'token:create',
    guarded(TokenCreateSchema, true, (input, ctx) => {
      if (!ctx.sessionId) return;
      const element = store.createElement(ctx.sessionId, input);
      io.to(ctx.sessionId).emit('token:created', element);
    }),
  );

  socket.on(
    'token:update',
    guarded(TokenUpdateSchema, true, ({ id, patch }, ctx) => {
      if (!ctx.sessionId) return;
      const element = store.updateElement(ctx.sessionId, id, patch);
      if (element) io.to(ctx.sessionId).emit('token:updated', element);
    }),
  );

  // Movement is allowed from the projector too, so players can move tokens on
  // the table screen (other token edits remain DM-only).
  socket.on(
    'token:move',
    guarded(TokenMoveSchema, false, ({ id, position }, ctx) => {
      if (!ctx.sessionId) return;
      const element = store.moveElement(ctx.sessionId, id, position);
      if (element) io.to(ctx.sessionId).emit('token:moved', { id, position });
    }),
  );

  socket.on(
    'token:delete',
    guarded(TokenIdSchema, true, ({ id }, ctx) => {
      if (!ctx.sessionId) return;
      if (store.deleteElement(ctx.sessionId, id)) {
        io.to(ctx.sessionId).emit('token:deleted', { id });
      }
    }),
  );

  socket.on(
    'token:select',
    guarded(TokenIdSchema, false, ({ id }, ctx) => {
      if (!ctx.sessionId) return;
      io.to(ctx.sessionId).emit('token:selected', { id });
    }),
  );

  socket.on(
    'obstacles:set',
    guarded(ObstaclesSetSchema, true, ({ mapId, obstacles }, ctx) => {
      if (!ctx.sessionId) return;
      const map = store.setObstacles(ctx.sessionId, mapId, obstacles);
      if (map) io.to(ctx.sessionId).emit('map:updated', map);
    }),
  );

  socket.on(
    'visibility:set-mode',
    guarded(VisibilitySetSchema, true, ({ mode }, ctx) => {
      if (!ctx.sessionId) return;
      store.setVisibility(ctx.sessionId, mode);
      io.to(ctx.sessionId).emit('visibility:updated', { mode });
    }),
  );

  socket.on(
    'initiative:update',
    guarded(z.array(InitiativeEntrySchema), true, (entries, ctx) => {
      if (!ctx.sessionId) return;
      const sorted = sortInitiative(entries);
      store.setInitiative(ctx.sessionId, sorted);
      io.to(ctx.sessionId).emit('initiative:updated', sorted);
    }),
  );

  socket.on('initiative:next-turn', () => {
    const ctx = contexts.get(socket);
    if (!ctx?.sessionId || ctx.role !== 'dm') return;
    const state = store.getOrCreate(ctx.sessionId);
    const result = nextTurn(state.initiative, state.session.currentTurnElementId);
    store.setInitiative(ctx.sessionId, result.entries);
    store.setCurrentTurn(ctx.sessionId, result.currentElementId);
    io.to(ctx.sessionId).emit('initiative:updated', result.entries);
  });

  socket.on(
    'dm:send-popup',
    guarded(PopupSchema, true, (payload, ctx) => {
      if (!ctx.sessionId) return;
      io.to(ctx.sessionId).emit('dm:popup', payload);
    }),
  );

  socket.on('disconnect', () => {
    contexts.delete(socket);
    app.log.info({ id: socket.id }, 'socket disconnected');
  });
});

try {
  await app.listen({ port: PORT, host: '0.0.0.0' });
  app.log.info(`D&D server listening on http://localhost:${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
