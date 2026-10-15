import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MigrationRequest } from '@/types/migration';
import {
  MAX_MIGRATION_ATTEMPTS,
  migrateWithRetry,
  type MigrationRunOptions
} from './migrationRunner';

const DATA: MigrationRequest = {
  vaults: [{ id: 'v1', name: 'Personal' }],
  folders: [],
  files: [],
  backlinks: []
};
const CREDENTIALS = { accessToken: 'jwt-token', tokenType: 'Bearer' };

const fetchMock = vi.fn<typeof fetch>();
const wait = vi.fn<(milliseconds: number) => Promise<void>>();
const onAttempt = vi.fn<(attempt: number) => void>();

function created(): Response {
  return new Response(JSON.stringify({ vaults: 1, folders: 0, files: 0, backlinks: 0 }), {
    status: 201
  });
}

function problem(status: number, detail: string): Response {
  return new Response(JSON.stringify({ statusCode: status, title: 'Problem', detail }), { status });
}

function run(options: Partial<MigrationRunOptions> = {}) {
  return migrateWithRetry(DATA, CREDENTIALS, {
    hasUnconfirmedUpload: false,
    onAttempt,
    wait,
    ...options
  });
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  wait.mockResolvedValue(undefined);
});

afterEach(() => {
  fetchMock.mockReset();
  wait.mockReset();
  onAttempt.mockReset();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('migrateWithRetry', () => {
  it('uploads once with the access token and reports success', async () => {
    // Arrange
    fetchMock.mockResolvedValue(created());

    // Act
    const outcome = await run();

    // Assert
    expect(outcome).toEqual({ status: 'success', isRecovered: false });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/v1/vaults/migrate');
    expect(init?.headers).toMatchObject({ Authorization: 'Bearer jwt-token' });
    expect(JSON.parse(init?.body as string)).toEqual(DATA);
    expect(wait).not.toHaveBeenCalled();
    expect(onAttempt.mock.calls).toEqual([[1]]);
  });

  it('retries a lost connection after one second and then two, then succeeds', async () => {
    // Arrange
    fetchMock
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(created());

    // Act
    const outcome = await run();

    // Assert
    expect(outcome).toEqual({ status: 'success', isRecovered: false });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(wait.mock.calls).toEqual([[1000], [2000]]);
    expect(onAttempt.mock.calls).toEqual([[1], [2], [3]]);
  });

  it('gives up after the maximum number of attempts and says the upload is unconfirmed', async () => {
    // Arrange
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    // Act
    const outcome = await run();

    // Assert
    expect(fetchMock).toHaveBeenCalledTimes(MAX_MIGRATION_ATTEMPTS);
    expect(outcome).toMatchObject({
      status: 'failure',
      attempts: MAX_MIGRATION_ATTEMPTS,
      isRetryable: true,
      hasUnconfirmedUpload: true
    });
  });

  it('retries when the server has a problem', async () => {
    // Arrange
    fetchMock
      .mockResolvedValueOnce(problem(503, 'An unexpected error occurred.'))
      .mockResolvedValueOnce(created());

    // Act
    const outcome = await run();

    // Assert
    expect(outcome.status).toBe('success');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('treats a response that cannot be read as a lost connection', async () => {
    // Arrange
    fetchMock
      .mockResolvedValueOnce(new Response('<html></html>', { status: 201 }))
      .mockResolvedValueOnce(created());

    // Act
    const outcome = await run();

    // Assert
    expect(outcome.status).toBe('success');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([400, 401, 404])('does not retry a rejection with status %i', async (status) => {
    // Arrange
    fetchMock.mockResolvedValue(problem(status, 'Rejected'));

    // Act
    const outcome = await run();

    // Assert
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(outcome).toMatchObject({
      status: 'failure',
      attempts: 1,
      isRetryable: false,
      hasUnconfirmedUpload: false
    });
  });

  it('reports a conflict on the first attempt as a failure that cannot be retried', async () => {
    // Arrange
    fetchMock.mockResolvedValue(problem(409, 'Some of this data has already been migrated.'));

    // Act
    const outcome = await run();

    // Assert
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(outcome).toMatchObject({ status: 'failure', isRetryable: false });
  });

  it('counts a conflict after a lost connection as the earlier upload having gone through', async () => {
    // Arrange
    fetchMock
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(problem(409, 'Some of this data has already been migrated.'));

    // Act
    const outcome = await run();

    // Assert
    expect(outcome).toEqual({ status: 'success', isRecovered: true });
  });

  it('counts a conflict as recovery when an earlier run left an upload unconfirmed', async () => {
    // Arrange
    fetchMock.mockResolvedValue(problem(409, 'Some of this data has already been migrated.'));

    // Act
    const outcome = await run({ hasUnconfirmedUpload: true });

    // Assert
    expect(outcome).toEqual({ status: 'success', isRecovered: true });
  });

  it('keeps an unconfirmed upload in mind when a later error is a plain rejection', async () => {
    // Arrange
    fetchMock
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(problem(400, 'The request is invalid.'));

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
    fetchMock
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(created());
    const pending = migrateWithRetry(DATA, CREDENTIALS, { hasUnconfirmedUpload: false, onAttempt });

    // Act
    await vi.advanceTimersByTimeAsync(999);
    const callsBeforeBackoffEnds = fetchMock.mock.calls.length;
    await vi.advanceTimersByTimeAsync(1);
    const outcome = await pending;

    // Assert
    expect(callsBeforeBackoffEnds).toBe(1);
    expect(outcome.status).toBe('success');
  });
});
