import { fetchSession, logout } from '@/lib/api/authApi';
import { resetCsrfToken, setUnauthorizedHandler } from '@/lib/api/httpClient';
import type { LoginResponse, SignupResponse } from '@/types/auth';
import { claimSessionRestore, endSession, getAuthState, startSession } from './authSessionStore';

const MILLIS_PER_SECOND = 1000;

setUnauthorizedHandler(() => {
  if (getAuthState().status === 'authenticated') {
    endSession('expired');
  }
});

/**
 * Marks the user as signed in after the server accepted a signup or login. The server has already stored the access
 * token in a cookie and replaced the CSRF token, so the page only keeps who signed in and until when.
 */
export function beginSession(response: SignupResponse | LoginResponse): void {
  resetCsrfToken();
  startSession(response.user, Date.now() + response.expiresIn * MILLIS_PER_SECOND);
}

/**
 * Finds out whether the browser already has a valid session cookie, which is how a signed-in user stays signed in
 * across reloads. It only checks once; a failed check leaves the visitor anonymous, and an answer that arrives after the
 * state has already changed is ignored.
 */
export async function ensureSessionRestored(): Promise<void> {
  if (!claimSessionRestore()) {
    return;
  }
  try {
    const session = await fetchSession();
    if (getAuthState().status !== 'loading') {
      return;
    }
    if (session === null) {
      endSession(null);
    } else {
      startSession(session.user, session.expiresAt);
    }
  } catch {
    if (getAuthState().status === 'loading') {
      endSession(null);
    }
  }
}

/**
 * Ends the session: the server clears the cookie, then the page forgets the user. If the server cannot be reached the
 * user stays signed in, because the cookie would still be valid, and the error is thrown so they can be told.
 *
 * @throws ApiError if the server could not be asked to end the session
 */
export async function signOut(): Promise<void> {
  await logout();
  resetCsrfToken();
  endSession('signed-out');
}
