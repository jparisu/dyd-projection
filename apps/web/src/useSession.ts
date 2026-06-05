import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { DEMO_SESSION_ID, type ClientRole } from '@dnd/shared';
import { useGameStore } from './store.js';

/** Connect to the session for this route and clean up on unmount. */
export function useSession(role: ClientRole): string {
  const { sessionId = DEMO_SESSION_ID } = useParams();
  const connect = useGameStore((s) => s.connect);
  const disconnect = useGameStore((s) => s.disconnect);

  useEffect(() => {
    connect(sessionId, role);
    return () => disconnect();
  }, [sessionId, role, connect, disconnect]);

  return sessionId;
}
