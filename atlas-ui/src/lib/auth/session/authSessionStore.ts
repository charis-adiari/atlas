import type { SignupResponse, UserDto } from '@/types/auth';

export const SESSION_STORAGE_KEY = 'atlas.auth.session';

const MILLIS_PER_SECOND = 1000;
const listeners = new Set<() => void>();

let storedValue: string | null | undefined;
let parsedValue: AuthSession | null = null;
let parsedSource: string | null = null;

/**
 * Represents a signed-in session: the access token and the account it belongs to.
 */
export interface AuthSession {
  accessToken: string;
  tokenType: string;
  expiresAt: number;
  user: UserDto;
}

/**
 * Gets the current session, or null when the user is anonymous or the token has expired. The same object is
 * returned until the stored session changes, so it can back useSyncExternalStore.
 */
export function getSession(): AuthSession | null {
  const value = readValue();

  if (value !== parsedSource) {
    parsedSource = value;
    parsedValue = parseSession(value);
  }

  return parsedValue !== null && parsedValue.expiresAt > Date.now() ? parsedValue : null;
}

/**
 * Gets the session during server rendering, where nobody is signed in.
 */
export function getServerSession(): AuthSession | null {
  return null;
}

/**
 * Registers a callback that runs whenever the session changes, including from another tab.
 *
 * @returns a function that removes the callback
 */
export function subscribeToSession(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener('storage', handleStorageEvent);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.removeEventListener('storage', handleStorageEvent);
    }
  };
}

/**
 * Keeps the access token from a signup response and marks the user as signed in. The session stays in memory even
 * if the browser refuses to persist it.
 */
export function saveSession(response: SignupResponse): void {
  const session: AuthSession = {
    accessToken: response.accessToken,
    tokenType: response.tokenType,
    expiresAt: Date.now() + response.expiresIn * MILLIS_PER_SECOND,
    user: response.user
  };

  writeValue(JSON.stringify(session));
}

/**
 * Forgets the session, leaving the user anonymous. Only the session is removed, never local content.
 */
export function clearSession(): void {
  writeValue(null);
}

/**
 * Reads the stored value once, then serves it from memory.
 */
function readValue(): string | null {
  if (storedValue === undefined) {
    if (typeof window === 'undefined') {
      return null;
    }
    storedValue = readFromBrowserStorage();
  }
  return storedValue;
}

/**
 * Updates the in-memory value and the browser storage, then notifies subscribers.
 */
function writeValue(value: string | null): void {
  storedValue = value;
  writeToBrowserStorage(value);
  notifyListeners();
}

/**
 * Reads the raw session from localStorage, treating an unavailable storage as empty.
 */
function readFromBrowserStorage(): string | null {
  try {
    return window.localStorage.getItem(SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Writes or removes the raw session in localStorage, ignoring a storage that is unavailable or full.
 */
function writeToBrowserStorage(value: string | null): void {
  try {
    if (value === null) {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    } else {
      window.localStorage.setItem(SESSION_STORAGE_KEY, value);
    }
  } catch {
    return;
  }
}

/**
 * Picks up a session change made in another tab.
 */
function handleStorageEvent(event: StorageEvent): void {
  if (event.key === SESSION_STORAGE_KEY || event.key === null) {
    storedValue = readFromBrowserStorage();
    notifyListeners();
  }
}

/**
 * Tells every subscriber that the session may have changed.
 */
function notifyListeners(): void {
  listeners.forEach((listener) => listener());
}

/**
 * Parses a stored session, returning null for anything that is not a complete session.
 */
function parseSession(value: string | null): AuthSession | null {
  if (value === null) {
    return null;
  }
  try {
    const candidate = JSON.parse(value) as Partial<AuthSession> | null;
    return isCompleteSession(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

/**
 * Checks that a parsed value has every field of a session.
 */
function isCompleteSession(candidate: Partial<AuthSession> | null): candidate is AuthSession {
  return (
    typeof candidate?.accessToken === 'string' &&
    typeof candidate.tokenType === 'string' &&
    typeof candidate.expiresAt === 'number' &&
    typeof candidate.user?.id === 'string' &&
    typeof candidate.user.email === 'string'
  );
}
