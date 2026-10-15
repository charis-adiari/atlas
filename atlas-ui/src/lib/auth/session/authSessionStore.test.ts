import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SignupResponse } from '@/types/auth';
import {
  SESSION_STORAGE_KEY,
  clearSession,
  getServerSession,
  getSession,
  saveSession,
  subscribeToSession
} from './authSessionStore';

const NOW = new Date('2026-10-12T12:00:00Z').getTime();
const SIGNUP_RESPONSE: SignupResponse = {
  user: { id: 'user-1', email: 'you@example.com' },
  accessToken: 'jwt-token',
  tokenType: 'Bearer',
  expiresIn: 3600
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  clearSession();
  window.localStorage.clear();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('saveSession', () => {
  it('marks the user as signed in with the token and account from the response', () => {
    // Arrange
    expect(getSession()).toBeNull();

    // Act
    saveSession(SIGNUP_RESPONSE);

    // Assert
    expect(getSession()).toEqual({
      accessToken: 'jwt-token',
      tokenType: 'Bearer',
      expiresAt: NOW + 3600 * 1000,
      user: { id: 'user-1', email: 'you@example.com' }
    });
  });

  it('persists the session so it survives a reload', () => {
    // Arrange
    const response = SIGNUP_RESPONSE;

    // Act
    saveSession(response);

    // Assert
    const stored = JSON.parse(window.localStorage.getItem(SESSION_STORAGE_KEY) ?? 'null');
    expect(stored.accessToken).toBe('jwt-token');
  });

  it('keeps the session in memory when the browser refuses to store it', () => {
    // Arrange
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });

    // Act
    saveSession(SIGNUP_RESPONSE);

    // Assert
    expect(getSession()?.accessToken).toBe('jwt-token');
  });

  it('notifies subscribers', () => {
    // Arrange
    const listener = vi.fn();
    const unsubscribe = subscribeToSession(listener);

    // Act
    saveSession(SIGNUP_RESPONSE);

    // Assert
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });
});

describe('getSession', () => {
  it('returns the same object until the session changes', () => {
    // Arrange
    saveSession(SIGNUP_RESPONSE);

    // Act
    const first = getSession();
    const second = getSession();

    // Assert
    expect(second).toBe(first);
  });

  it('treats an expired session as anonymous', () => {
    // Arrange
    saveSession(SIGNUP_RESPONSE);

    // Act
    vi.setSystemTime(NOW + 3600 * 1000 + 1);

    // Assert
    expect(getSession()).toBeNull();
  });

  it('restores a stored session when the app loads', async () => {
    // Arrange
    const session = { ...SIGNUP_RESPONSE, expiresAt: NOW + 60_000 };
    window.localStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        accessToken: session.accessToken,
        tokenType: session.tokenType,
        expiresAt: session.expiresAt,
        user: session.user
      })
    );
    vi.resetModules();

    // Act
    const freshStore = await import('./authSessionStore');

    // Assert
    expect(freshStore.getSession()?.user.email).toBe('you@example.com');
  });

  it.each(['not json', '{"accessToken":"x"}', 'null'])(
    'ignores the stored value %j because it is not a session',
    async (stored) => {
      // Arrange
      window.localStorage.setItem(SESSION_STORAGE_KEY, stored);
      vi.resetModules();

      // Act
      const freshStore = await import('./authSessionStore');

      // Assert
      expect(freshStore.getSession()).toBeNull();
    }
  );

  it('treats an unreadable storage as empty', async () => {
    // Arrange
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Denied', 'SecurityError');
    });
    vi.resetModules();

    // Act
    const freshStore = await import('./authSessionStore');

    // Assert
    expect(freshStore.getSession()).toBeNull();
  });
});

describe('clearSession', () => {
  it('leaves the user anonymous and removes the stored session', () => {
    // Arrange
    saveSession(SIGNUP_RESPONSE);

    // Act
    clearSession();

    // Assert
    expect(getSession()).toBeNull();
    expect(window.localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });

  it('leaves other local data alone', () => {
    // Arrange
    window.localStorage.setItem('atlas.vaults', '[1,2,3]');
    saveSession(SIGNUP_RESPONSE);

    // Act
    clearSession();

    // Assert
    expect(window.localStorage.getItem('atlas.vaults')).toBe('[1,2,3]');
  });
});

describe('subscribeToSession', () => {
  it('stops notifying after unsubscribing', () => {
    // Arrange
    const listener = vi.fn();
    const unsubscribe = subscribeToSession(listener);
    unsubscribe();

    // Act
    saveSession(SIGNUP_RESPONSE);

    // Assert
    expect(listener).not.toHaveBeenCalled();
  });

  it('picks up a sign-in made in another tab', () => {
    // Arrange
    const listener = vi.fn();
    const unsubscribe = subscribeToSession(listener);
    const stored = JSON.stringify({
      accessToken: 'other-tab-jwt',
      tokenType: 'Bearer',
      expiresAt: NOW + 60_000,
      user: { id: 'user-2', email: 'other@example.com' }
    });
    window.localStorage.setItem(SESSION_STORAGE_KEY, stored);

    // Act
    window.dispatchEvent(new StorageEvent('storage', { key: SESSION_STORAGE_KEY }));

    // Assert
    expect(listener).toHaveBeenCalledTimes(1);
    expect(getSession()?.accessToken).toBe('other-tab-jwt');
    unsubscribe();
  });

  it('ignores storage changes to other keys', () => {
    // Arrange
    const listener = vi.fn();
    const unsubscribe = subscribeToSession(listener);

    // Act
    window.dispatchEvent(new StorageEvent('storage', { key: 'something-else' }));

    // Assert
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });
});

describe('getServerSession', () => {
  it('is anonymous during server rendering', () => {
    // Arrange
    saveSession(SIGNUP_RESPONSE);

    // Act
    const session = getServerSession();

    // Assert
    expect(session).toBeNull();
  });
});
