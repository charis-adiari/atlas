import { useEffect, useSyncExternalStore } from 'react';
import {
  AuthStatus,
  getAuthState,
  getServerAuthState,
  subscribeToAuth,
  type AuthState
} from '@/lib/auth/session/authSessionStore';
import { ensureSessionRestored } from '@/lib/auth/session/sessionService';

/**
 * Represents who is using the app and whether that has been worked out yet.
 */
export interface UseAuthSessionResult extends AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
}

/**
 * Reads who is signed in and re-renders when that changes. The first use also asks the server whether the browser has
 * a valid session cookie.
 */
export function useAuthSession(): UseAuthSessionResult {
  const state = useSyncExternalStore(subscribeToAuth, getAuthState, getServerAuthState);

  useEffect(() => {
    void ensureSessionRestored();
  }, []);

  return {
    ...state,
    isAuthenticated: state.status === AuthStatus.authenticated,
    isLoading: state.status === AuthStatus.loading
  };
}
