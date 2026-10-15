import { useSyncExternalStore } from 'react';
import {
  getServerSession,
  getSession,
  subscribeToSession,
  type AuthSession
} from '@/lib/auth/session/authSessionStore';

/**
 * Represents who is using the app: a signed-in user with a session, or an anonymous one.
 */
export interface UseAuthSessionResult {
  session: AuthSession | null;
  isAuthenticated: boolean;
}

/**
 * Reads the current session and re-renders when it changes.
 */
export function useAuthSession(): UseAuthSessionResult {
  const session = useSyncExternalStore(subscribeToSession, getSession, getServerSession);

  return { session, isAuthenticated: session !== null };
}
