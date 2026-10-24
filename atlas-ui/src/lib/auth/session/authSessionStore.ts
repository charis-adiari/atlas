import type { UserDto } from '@/types/auth';

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';
export type SessionEndReason = 'expired' | 'signed-out';

/**
 * Represents who is signed in and until when. It holds no token: the access token lives in an HttpOnly cookie that
 * scripts cannot read.
 */
export interface AuthSession {
  user: UserDto;
  expiresAt: number;
}

/**
 * Represents what the app knows about the visitor: not yet checked, signed in, or anonymous, and why a session ended.
 */
export interface AuthState {
  status: AuthStatus;
  session: AuthSession | null;
  endReason: SessionEndReason | null;
}

const INITIAL_STATE: AuthState = { status: 'loading', session: null, endReason: null };
const MAX_TIMER_MS = 2_147_483_647;
const listeners = new Set<() => void>();

let state: AuthState = INITIAL_STATE;
let expiryTimer: ReturnType<typeof setTimeout> | null = null;
let isRestoreInProgress = false;

/**
 * Gets the current auth state. The same object is returned until it changes, so it can back useSyncExternalStore.
 */
export function getAuthState(): AuthState {
  return state;
}

/**
 * Gets the auth state during server rendering, where nothing has been checked yet.
 */
export function getServerAuthState(): AuthState {
  return INITIAL_STATE;
}

/**
 * Registers a callback that runs whenever the auth state changes.
 *
 * @returns a function that removes the callback
 */
export function subscribeToAuth(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Claims the job of finding out whether the browser already has a session, so only one caller does it. It is granted
 * once, while nothing has been checked yet, and the claim ends as soon as the state changes.
 *
 * @returns true if the caller should go and check
 */
export function claimSessionRestore(): boolean {
  if (isRestoreInProgress || state.status !== 'loading') {
    return false;
  }
  isRestoreInProgress = true;
  return true;
}

/**
 * Marks the user as signed in until the given moment. When that moment passes, the session ends by itself, which is what
 * turns an expired token into a signed-out page without waiting for a request to fail.
 *
 * @param user who signed in
 * @param expiresAt when the access token stops being valid, in epoch milliseconds
 */
export function startSession(user: UserDto, expiresAt: number): void {
  clearExpiryTimer();
  isRestoreInProgress = false;
  if (expiresAt <= Date.now()) {
    endSession('expired');
    return;
  }
  setState({ status: 'authenticated', session: { user, expiresAt }, endReason: null });
  scheduleExpiry(expiresAt);
}

/**
 * Leaves the user anonymous, remembering why the session ended so the app can tell them.
 */
export function endSession(reason: SessionEndReason | null): void {
  clearExpiryTimer();
  isRestoreInProgress = false;
  setState({ status: 'anonymous', session: null, endReason: reason });
}

/**
 * Returns the store to its initial state, before anything has been checked.
 */
export function resetAuthState(): void {
  clearExpiryTimer();
  isRestoreInProgress = false;
  setState(INITIAL_STATE);
}

/**
 * Replaces the state and tells subscribers, unless nothing changed.
 */
function setState(next: AuthState): void {
  if (
    next.status === state.status &&
    next.endReason === state.endReason &&
    next.session?.user.id === state.session?.user.id &&
    next.session?.expiresAt === state.session?.expiresAt
  ) {
    return;
  }
  state = next;
  listeners.forEach((listener) => listener());
}

/**
 * Ends the session when its expiry arrives, checking again if the timer fired early because of its length limit.
 */
function scheduleExpiry(expiresAt: number): void {
  expiryTimer = setTimeout(
    () => {
      if (Date.now() >= expiresAt) {
        endSession('expired');
      } else {
        scheduleExpiry(expiresAt);
      }
    },
    Math.min(expiresAt - Date.now(), MAX_TIMER_MS)
  );
}

/**
 * Cancels a pending expiry timer.
 */
function clearExpiryTimer(): void {
  if (expiryTimer !== null) {
    clearTimeout(expiryTimer);
    expiryTimer = null;
  }
}
