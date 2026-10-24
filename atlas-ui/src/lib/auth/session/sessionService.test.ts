import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api/ApiError';
import { httpClient } from '@/lib/api/httpClient';
import { HttpMock, jsonReply, problemReply } from '@/test/HttpMock';
import { getAuthState, resetAuthState, startSession } from './authSessionStore';
import { beginSession, ensureSessionRestored, signOut } from './sessionService';

const NOW = new Date('2026-10-12T12:00:00Z').getTime();
const USER = { id: 'user-1', email: 'jd@example.com' };
const http = new HttpMock();

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(NOW);
  http.install();
});

afterEach(() => {
  http.uninstall();
  resetAuthState();
  vi.useRealTimers();
});

describe('beginSession', () => {
  it('signs the user in until the lifetime the server gave runs out', () => {
    // Arrange
    const response = { user: USER, expiresIn: 3600 };

    // Act
    beginSession(response);

    // Assert
    expect(getAuthState().session).toEqual({ user: USER, expiresAt: NOW + 3_600_000 });
  });

  it('asks for a new CSRF token afterwards, because the server replaced it', async () => {
    // Arrange
    http.handler.mockResolvedValue(jsonReply(200, {}));
    await httpClient.post('/things', {});

    // Act
    beginSession({ user: USER, expiresIn: 3600 });
    await httpClient.post('/things', {});

    // Assert
    expect(http.csrfRequestCount).toBe(2);
  });
});

describe('ensureSessionRestored', () => {
  it('signs the user in when the browser has a valid session cookie', async () => {
    // Arrange
    http.handler.mockResolvedValue(jsonReply(200, { user: USER, expiresAt: NOW + 600_000 }));

    // Act
    await ensureSessionRestored();

    // Assert
    expect(getAuthState().status).toBe('authenticated');
    expect(getAuthState().session?.user).toEqual(USER);
  });

  it('leaves the visitor anonymous, without a reason, when there is no session', async () => {
    // Arrange
    http.handler.mockResolvedValue(problemReply(401, 'There is no active session.'));

    // Act
    await ensureSessionRestored();

    // Assert
    expect(getAuthState()).toEqual({ status: 'anonymous', session: null, endReason: null });
  });

  it('leaves the visitor anonymous when the check itself fails', async () => {
    // Arrange
    http.handler.mockRejectedValue(new TypeError('Failed to fetch'));

    // Act
    await ensureSessionRestored();

    // Assert
    expect(getAuthState().status).toBe('anonymous');
  });

  it('checks only once however many times it is asked', async () => {
    // Arrange
    http.handler.mockResolvedValue(jsonReply(200, { user: USER, expiresAt: NOW + 600_000 }));

    // Act
    await Promise.all([ensureSessionRestored(), ensureSessionRestored()]);
    await ensureSessionRestored();

    // Assert
    expect(http.handler).toHaveBeenCalledTimes(1);
  });
});

describe('a restore that finishes late', () => {
  it('is ignored when the user has already signed in by other means in the meantime', async () => {
    // Arrange
    let finish: (reply: ReturnType<typeof problemReply>) => void = () => undefined;
    http.handler.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const restoring = ensureSessionRestored();

    // Act
    startSession(USER, NOW + 600_000);
    finish(problemReply(401, 'There is no active session.'));
    await restoring;

    // Assert
    expect(getAuthState().status).toBe('authenticated');
  });
});

describe('signOut', () => {
  it('asks the server to clear the cookie, then forgets the user', async () => {
    // Arrange
    startSession(USER, NOW + 600_000);
    http.handler.mockResolvedValue(jsonReply(204));

    // Act
    await signOut();

    // Assert
    expect(http.handler.mock.calls[0][0]).toMatchObject({ method: 'POST', path: '/auth/logout' });
    expect(getAuthState()).toEqual({ status: 'anonymous', session: null, endReason: 'signed-out' });
  });

  it('keeps the user signed in, and says so, when the server cannot be reached', async () => {
    // Arrange
    startSession(USER, NOW + 600_000);
    http.handler.mockRejectedValue(new TypeError('Failed to fetch'));

    // Act
    const failure = signOut();

    // Assert
    await expect(failure).rejects.toBeInstanceOf(ApiError);
    expect(getAuthState().status).toBe('authenticated');
  });
});

describe('an expired session reported by the server', () => {
  it('signs the user out with the reason "expired" when a protected call answers 401', async () => {
    // Arrange
    startSession(USER, NOW + 600_000);
    http.handler.mockResolvedValue(problemReply(401, 'Authentication is required.'));

    // Act
    await httpClient.get('/vaults').catch(() => undefined);

    // Assert
    expect(getAuthState()).toEqual({ status: 'anonymous', session: null, endReason: 'expired' });
  });

  it('does nothing for an anonymous visitor', async () => {
    // Arrange
    http.handler.mockResolvedValue(problemReply(401, 'Authentication is required.'));
    resetAuthState();

    // Act
    await httpClient.get('/vaults').catch(() => undefined);

    // Assert
    expect(getAuthState().status).toBe('loading');
  });
});
