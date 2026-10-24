import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ALREADY_MIGRATED_MESSAGE } from '@/lib/api/migrationApi';
import { HttpMock, TEST_CSRF_TOKEN, jsonReply, problemReply } from '@/test/HttpMock';
import type { MigrationRequest } from '@/types/migration';
import {
  MAX_MIGRATION_ATTEMPTS,
  migrateWithRetry,
  type MigrationRunOptions
} from './migrationRunner';

const DATA: MigrationRequest = {
  vaults: [{ id: 'v1', name: 'Personal', createdAt: '2026-01-01T09:00:00Z' }],
  folders: [],
  files: [],
  backlinks: []
};

const http = new HttpMock();
const wait = vi.fn<(milliseconds: number) => Promise<void>>();
const onAttempt = vi.fn<(attempt: number) => void>();

function created() {
  return jsonReply(201);
}

function run(options: Partial<MigrationRunOptions> = {}) {
  return migrateWithRetry(DATA, { hasUnconfirmedUpload: false, onAttempt, wait, ...options });
}

beforeEach(() => {
  http.install();
  wait.mockResolvedValue(undefined);
});

afterEach(() => {
  http.uninstall();
  wait.mockReset();
  onAttempt.mockReset();
  vi.useRealTimers();
});

describe('migrateWithRetry', () => {
  it('uploads once, authenticated by the session cookie and protected by the CSRF token, and reports success', async () => {
    // Arrange
    http.handler.mockResolvedValue(created());

    // Act
    const outcome = await run();

    // Assert
    expect(outcome).toEqual({ status: 'success', isRecovered: false });
    expect(http.handler).toHaveBeenCalledTimes(1);
    const request = http.handler.mock.calls[0][0];
    expect(request.path).toBe('/vaults/migrate');
    expect(request.headers['x-csrf-token']).toBe(TEST_CSRF_TOKEN);
    expect(request.headers).not.toHaveProperty('authorization');
    expect(request.body).toEqual(DATA);
    expect(wait).not.toHaveBeenCalled();
    expect(onAttempt.mock.calls).toEqual([[1]]);
  });

  it('retries a lost connection after one second and then two, then succeeds', async () => {
    // Arrange
    http.handler
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(created());

    // Act
    const outcome = await run();

    // Assert
    expect(outcome).toEqual({ status: 'success', isRecovered: false });
    expect(http.handler).toHaveBeenCalledTimes(3);
    expect(wait.mock.calls).toEqual([[1000], [2000]]);
    expect(onAttempt.mock.calls).toEqual([[1], [2], [3]]);
  });

  it('gives up after the maximum number of attempts and says the upload is unconfirmed', async () => {
    // Arrange
    http.handler.mockRejectedValue(new TypeError('Failed to fetch'));

    // Act
    const outcome = await run();

    // Assert
    expect(http.handler).toHaveBeenCalledTimes(MAX_MIGRATION_ATTEMPTS);
    expect(outcome).toMatchObject({
      status: 'failure',
      attempts: MAX_MIGRATION_ATTEMPTS,
      isRetryable: true,
      hasUnconfirmedUpload: true
    });
  });

  it('retries when the server has a problem', async () => {
    // Arrange
    http.handler
      .mockResolvedValueOnce(problemReply(503, 'An unexpected error occurred.'))
      .mockResolvedValueOnce(created());

    // Act
    const outcome = await run();

    // Assert
    expect(outcome.status).toBe('success');
    expect(http.handler).toHaveBeenCalledTimes(2);
  });

  it.each([400, 401, 404])('does not retry a rejection with status %i', async (status) => {
    // Arrange
    http.handler.mockResolvedValue(problemReply(status, 'Rejected'));

    // Act
    const outcome = await run();

    // Assert
    expect(http.handler).toHaveBeenCalledTimes(1);
    expect(outcome).toMatchObject({
      status: 'failure',
      attempts: 1,
      isRetryable: false,
      hasUnconfirmedUpload: false
    });
  });

  it('reports a conflict on the first attempt as a failure that cannot be retried', async () => {
    // Arrange
    http.handler.mockResolvedValue(problemReply(400, ALREADY_MIGRATED_MESSAGE));

    // Act
    const outcome = await run();

    // Assert
    expect(http.handler).toHaveBeenCalledTimes(1);
    expect(outcome).toMatchObject({ status: 'failure', isRetryable: false });
  });

  it('counts a conflict after a lost connection as the earlier upload having gone through', async () => {
    // Arrange
    http.handler
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(problemReply(400, ALREADY_MIGRATED_MESSAGE));

    // Act
    const outcome = await run();

    // Assert
    expect(outcome).toEqual({ status: 'success', isRecovered: true });
  });

  it('counts a conflict as recovery when an earlier run left an upload unconfirmed', async () => {
    // Arrange
    http.handler.mockResolvedValue(problemReply(400, ALREADY_MIGRATED_MESSAGE));

    // Act
    const outcome = await run({ hasUnconfirmedUpload: true });

    // Assert
    expect(outcome).toEqual({ status: 'success', isRecovered: true });
  });

  it('keeps an unconfirmed upload in mind when a later error is a plain rejection', async () => {
    // Arrange
    http.handler
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(problemReply(400, 'The request is invalid.'));

    // Act
    const outcome = await run();

    // Assert
    expect(outcome).toMatchObject({
      status: 'failure',
      isRetryable: false,
      hasUnconfirmedUpload: true
    });
  });

  it('pauses with real timers between attempts by default', async () => {
    // Arrange
    vi.useFakeTimers();
    http.handler
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(created());
    const pending = migrateWithRetry(DATA, { hasUnconfirmedUpload: false, onAttempt });

    // Act
    await vi.advanceTimersByTimeAsync(999);
    const callsBeforeBackoffEnds = http.handler.mock.calls.length;
    await vi.advanceTimersByTimeAsync(1);
    const outcome = await pending;

    // Assert
    expect(callsBeforeBackoffEnds).toBe(1);
    expect(outcome.status).toBe('success');
  });
});
