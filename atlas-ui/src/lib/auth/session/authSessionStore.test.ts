import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  endSession,
  getAuthState,
  getServerAuthState,
  resetAuthState,
  startSession,
  subscribeToAuth
} from './authSessionStore';

const NOW = new Date('2026-10-12T12:00:00Z').getTime();
const USER = { id: 'user-1', email: 'jd@example.com' };
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  resetAuthState();
  vi.useRealTimers();
});

describe('authSessionStore', () => {
  it('starts out not yet checked', () => {
    // Arrange
    const state = getAuthState();

    // Act
    const { status, session } = state;

    // Assert
    expect(status).toBe('loading');
    expect(session).toBeNull();
    expect(getServerAuthState().status).toBe('loading');
  });

  it('marks the user as signed in and holds no token', () => {
    // Arrange
    const expiresAt = NOW + HOUR;

    // Act
    startSession(USER, expiresAt);

    // Assert
    const state = getAuthState();
    expect(state.status).toBe('authenticated');
    expect(state.session).toEqual({ user: USER, expiresAt });
    expect(JSON.stringify(state)).not.toMatch(/token|jwt/i);
  });

  it('returns the same object until the state changes', () => {
    // Arrange
    startSession(USER, NOW + HOUR);

    // Act
    const first = getAuthState();
    const second = getAuthState();

    // Assert
    expect(second).toBe(first);
  });

  it('notifies subscribers of changes, and stops after unsubscribing', () => {
    // Arrange
    const listener = vi.fn();
    const unsubscribe = subscribeToAuth(listener);

    // Act
    startSession(USER, NOW + HOUR);
    unsubscribe();
    endSession('signed-out');

    // Assert
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('does not notify when nothing changed', () => {
    // Arrange
    endSession(null);
    const listener = vi.fn();
    subscribeToAuth(listener);

    // Act
    endSession(null);

    // Assert
    expect(listener).not.toHaveBeenCalled();
  });

  it('ends the session by itself when it expires and remembers why', () => {
    // Arrange
    startSession(USER, NOW + HOUR);

    // Act
    vi.advanceTimersByTime(HOUR);

    // Assert
    expect(getAuthState()).toEqual({ status: 'anonymous', session: null, endReason: 'expired' });
  });

  it('treats a session that has already expired as ended', () => {
    // Arrange
    const expiresAt = NOW - 1;

    // Act
    startSession(USER, expiresAt);

    // Assert
    expect(getAuthState()).toEqual({ status: 'anonymous', session: null, endReason: 'expired' });
  });

  it('stays signed in until the expiry moment', () => {
    // Arrange
    startSession(USER, NOW + HOUR);

    // Act
    vi.advanceTimersByTime(HOUR - 1);

    // Assert
    expect(getAuthState().status).toBe('authenticated');
  });

  it('keeps the reason when the user signs out before the expiry', () => {
    // Arrange
    startSession(USER, NOW + HOUR);

    // Act
    endSession('signed-out');
    vi.advanceTimersByTime(2 * HOUR);

    // Assert
    expect(getAuthState().endReason).toBe('signed-out');
  });

  it('handles an expiry further away than a timer can wait', () => {
    // Arrange
    const thirtyDays = 30 * DAY;
    startSession(USER, NOW + thirtyDays);

    // Act
    vi.advanceTimersByTime(25 * DAY);
    const statusAfterTwentyFiveDays = getAuthState().status;
    vi.advanceTimersByTime(5 * DAY);

    // Assert
    expect(statusAfterTwentyFiveDays).toBe('authenticated');
    expect(getAuthState().endReason).toBe('expired');
  });

  it('goes back to not yet checked when reset', () => {
    // Arrange
    startSession(USER, NOW + HOUR);

    // Act
    resetAuthState();

    // Assert
    expect(getAuthState().status).toBe('loading');
    vi.advanceTimersByTime(2 * HOUR);
    expect(getAuthState().status).toBe('loading');
  });
});
