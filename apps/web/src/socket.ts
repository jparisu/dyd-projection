import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@dnd/shared';

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:4000';

export function createSocket(): AppSocket {
  return io(SERVER_URL, { autoConnect: true, transports: ['websocket', 'polling'] });
}
