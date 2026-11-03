import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetAuthState, endSession, startSession } from '@/lib/auth/session/authSessionStore';
import { ALREADY_MIGRATED_MESSAGE } from '@/lib/api/migrationApi';
import { UNEXPECTED_MIGRATION_MESSAGE } from '@/lib/migration/migrationFailure';
import { setErrorLogSink, type ErrorLogEntry } from '@/lib/logging/logger';
import {
  HttpMock,
  jsonReply,
  problemReply,
  type MockReply,
  TEST_CSRF_TOKEN
} from '@/test/HttpMock';
import { LOCAL_VAULT_DATA_KEY, MIGRATION_RECORD_KEY } from '@/lib/migration/local/localVaultData';
import type { MigrationRequest } from '@/types/migration';
import { MigrationFlow } from './MigrationFlow';

const DATA: MigrationRequest = {
  vaults: [
    { id: 'v1', name: 'Personal', createdAt: '2026-01-01T00:00:00Z' },
    { id: 'v2', name: 'Work ideas', createdAt: '2026-01-01T09:00:00Z' }
  ],
  folders: [
    {
      id: 'f1',
      vaultId: 'v1',
      parentFolderId: null,
      name: 'Inbox',
      createdAt: '2026-01-01T09:00:00Z'
    }
  ],
  files: [
    {
      id: 'n1',
      vaultId: 'v1',
      folderId: 'f1',
      type: 'note',
      name: 'Weekly review',
      content: '# Hi',
      createdAt: '2026-01-01T09:00:00Z'
    },
    {
      id: 'c1',
      vaultId: 'v2',
      folderId: null,
      type: 'canvas',
      name: 'Mind map',
      content: '{}',
      createdAt: '2026-01-01T09:00:00Z'
    }
  ],
  backlinks: []
};
const STORED_DATA = JSON.stringify(DATA);

const http = new HttpMock();

function created() {
  return jsonReply(201, { vaults: 2, folders: 1, files: 2, backlinks: 0 });
}

function renderFlow() {
  const onFinish = vi.fn();
  render(<MigrationFlow data={DATA} onFinish={onFinish} />);
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  return { onFinish, user };
}

async function advance(milliseconds: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(milliseconds);
  });
}

async function failThreeTimes(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  http.handler.mockRejectedValue(new TypeError('Failed to fetch'));
  await user.click(screen.getByRole('button', { name: 'Migrate my vaults' }));
  await screen.findByText(/Retrying \(attempt 2 of 3\)/);
  await advance(1000);
  await screen.findByText(/Retrying \(attempt 3 of 3\)/);
  await advance(2000);
  await screen.findByRole('heading', { name: 'Migration interrupted' });
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  http.install();
  window.localStorage.setItem(LOCAL_VAULT_DATA_KEY, STORED_DATA);
  startSession({ id: 'user-1', email: 'jd@example.com' }, Date.now() + 3_600_000);
});

afterEach(() => {
  http.uninstall();
  resetAuthState();
  setErrorLogSink(null);
  window.localStorage.clear();
  vi.useRealTimers();
});

describe('MigrationFlow prompt', () => {
  it('asks to migrate and says what was found on the device', () => {
    // Arrange
    renderFlow();

    // Act
    const dialog = screen.getByRole('dialog', { name: 'Move your vaults to your account?' });

    // Assert
    expect(dialog).toHaveTextContent('2 vaults · 1 note · 1 canvas');
    expect(http.handler).not.toHaveBeenCalled();
  });

  it('does nothing but report that the data stays local when the user declines', async () => {
    // Arrange
    const { user, onFinish } = renderFlow();

    // Act
    await user.click(screen.getByRole('button', { name: 'Keep on this device only' }));

    // Assert
    expect(onFinish).toHaveBeenCalledWith('kept-local');
    expect(http.handler).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(LOCAL_VAULT_DATA_KEY)).toBe(STORED_DATA);
    expect(window.localStorage.getItem(MIGRATION_RECORD_KEY)).toBeNull();
  });

  it('counts dismissing the prompt as declining', () => {
    // Arrange
    const { onFinish } = renderFlow();

    // Act
    fireEvent(screen.getByRole('dialog'), new Event('close'));

    // Assert
    expect(onFinish).toHaveBeenCalledWith('kept-local');
    expect(http.handler).not.toHaveBeenCalled();
  });
});

describe('MigrationFlow upload', () => {
  it('uploads everything in one request authenticated by the session cookie', async () => {
    // Arrange
    http.handler.mockResolvedValue(created());
    const { user } = renderFlow();

    // Act
    await user.click(screen.getByRole('button', { name: 'Migrate my vaults' }));
    await screen.findByRole('heading', { name: 'Your vaults are backed up' });

    // Assert
    expect(http.handler).toHaveBeenCalledTimes(1);
    const request = http.handler.mock.calls[0][0];
    expect(request.path).toBe('/vaults/migrate');
    expect(request.headers).not.toHaveProperty('authorization');
    expect(request.headers['x-csrf-token']).toBe(TEST_CSRF_TOKEN);
    expect(request.body).toEqual(DATA);
  });

  it('shows progress that cannot be dismissed while the upload is running', async () => {
    // Arrange
    http.handler.mockReturnValue(new Promise(() => undefined));
    const { user, onFinish } = renderFlow();

    // Act
    await user.click(screen.getByRole('button', { name: 'Migrate my vaults' }));
    const escape = new Event('cancel', { cancelable: true });
    screen.getByRole('dialog').dispatchEvent(escape);

    // Assert
    expect(screen.getByRole('dialog', { name: 'Migrating your vaults…' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Uploading 2 vaults…');
    expect(screen.getAllByText('Uploading…')).toHaveLength(2);
    expect(escape.defaultPrevented).toBe(true);
    expect(onFinish).not.toHaveBeenCalled();
  });

  it('flags the vaults as migrated only after the API confirms, and keeps the local data', async () => {
    // Arrange
    let confirm: (reply: MockReply) => void = () => undefined;
    http.handler.mockReturnValue(new Promise<MockReply>((resolve) => (confirm = resolve)));
    const { user } = renderFlow();
    await user.click(screen.getByRole('button', { name: 'Migrate my vaults' }));
    const recordWhileUploading = window.localStorage.getItem(MIGRATION_RECORD_KEY);

    // Act
    await act(async () => confirm(created()));
    await screen.findByRole('heading', { name: 'Your vaults are backed up' });

    // Assert
    expect(recordWhileUploading).toBeNull();
    const record = JSON.parse(window.localStorage.getItem(MIGRATION_RECORD_KEY) ?? 'null');
    expect(record.userId).toBe('user-1');
    expect(record.vaultIds).toEqual(['v1', 'v2']);
    expect(window.localStorage.getItem(LOCAL_VAULT_DATA_KEY)).toBe(STORED_DATA);
  });

  it('confirms the backup and reports the data as migrated', async () => {
    // Arrange
    http.handler.mockResolvedValue(created());
    const { user, onFinish } = renderFlow();
    await user.click(screen.getByRole('button', { name: 'Migrate my vaults' }));

    // Act
    const dialog = await screen.findByRole('dialog', { name: 'Your vaults are backed up' });
    await user.click(screen.getByRole('button', { name: 'Open my vaults' }));

    // Assert
    expect(dialog).toHaveTextContent('All 2 vaults are now linked to your account.');
    expect(dialog).toHaveTextContent('Signed in as jd@example.com');
    expect(onFinish).toHaveBeenCalledWith('migrated');
  });
});

describe('MigrationFlow failures', () => {
  it('retries a lost connection with backoff and then offers to retry, keeping the local data', async () => {
    // Arrange
    const { user } = renderFlow();

    // Act
    await failThreeTimes(user);

    // Assert
    expect(http.handler).toHaveBeenCalledTimes(3);
    expect(screen.getByRole('alert')).toHaveTextContent('Connection lost while uploading');
    expect(screen.getByRole('alert')).toHaveTextContent(
      "We tried 3 times and couldn't confirm the upload."
    );
    expect(screen.getAllByText('Not confirmed')).toHaveLength(2);
    expect(
      screen.getByText('All 2 vaults are still on this device, unchanged.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry migration' })).toBeInTheDocument();
    expect(window.localStorage.getItem(LOCAL_VAULT_DATA_KEY)).toBe(STORED_DATA);
    expect(window.localStorage.getItem(MIGRATION_RECORD_KEY)).toBeNull();
  });

  it('succeeds when the user retries after the connection comes back', async () => {
    // Arrange
    const { user } = renderFlow();
    await failThreeTimes(user);
    http.handler.mockReset();
    http.handler.mockResolvedValue(created());

    // Act
    await user.click(screen.getByRole('button', { name: 'Retry migration' }));
    await screen.findByRole('heading', { name: 'Your vaults are backed up' });

    // Assert
    expect(http.handler).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem(MIGRATION_RECORD_KEY)).not.toBeNull();
  });

  it('counts a conflict on retry as the earlier upload having gone through', async () => {
    // Arrange
    const { user } = renderFlow();
    await failThreeTimes(user);
    http.handler.mockReset();
    http.handler.mockResolvedValue(problemReply(400, ALREADY_MIGRATED_MESSAGE));

    // Act
    await user.click(screen.getByRole('button', { name: 'Retry migration' }));
    await screen.findByRole('heading', { name: 'Your vaults are backed up' });

    // Assert
    expect(window.localStorage.getItem(MIGRATION_RECORD_KEY)).not.toBeNull();
  });

  it('does not retry data the server rejected, shows a generic message and logs the details, without a retry button', async () => {
    // Arrange
    const sink = vi.fn<(entry: ErrorLogEntry) => void>();
    setErrorLogSink(sink);
    http.handler.mockResolvedValue(problemReply(400, 'Folder f1 points at a missing parent.'));
    const { user } = renderFlow();

    // Act
    await user.click(screen.getByRole('button', { name: 'Migrate my vaults' }));
    await screen.findByRole('heading', { name: 'Migration interrupted' });

    // Assert
    expect(http.handler).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('alert')).toHaveTextContent(UNEXPECTED_MIGRATION_MESSAGE);
    expect(screen.getByRole('alert')).not.toHaveTextContent('missing parent');
    expect(sink).toHaveBeenCalledTimes(1);
    expect(sink.mock.calls[0][0]).toMatchObject({
      context: 'migration',
      statusCode: 400,
      message: 'Folder f1 points at a missing parent.'
    });
    expect(screen.getAllByText('Not uploaded')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Retry migration' })).not.toBeInTheDocument();
    expect(window.localStorage.getItem(MIGRATION_RECORD_KEY)).toBeNull();
  });

  it('reports a conflict on a first attempt as a failure', async () => {
    // Arrange
    http.handler.mockResolvedValue(problemReply(400, ALREADY_MIGRATED_MESSAGE));
    const { user } = renderFlow();

    // Act
    await user.click(screen.getByRole('button', { name: 'Migrate my vaults' }));
    await screen.findByRole('heading', { name: 'Migration interrupted' });

    // Assert
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Some of this data is already on an account'
    );
    expect(window.localStorage.getItem(MIGRATION_RECORD_KEY)).toBeNull();
  });

  it('fails without sending anything when nobody is signed in', async () => {
    // Arrange
    const { user } = renderFlow();
    act(() => endSession('expired'));

    // Act
    await user.click(screen.getByRole('button', { name: 'Migrate my vaults' }));
    await screen.findByRole('heading', { name: 'Migration interrupted' });

    // Assert
    expect(http.handler).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Your session has expired');
  });

  it('lets the user continue without migrating, leaving the data local', async () => {
    // Arrange
    http.handler.mockResolvedValue(problemReply(400, 'Rejected'));
    const { user, onFinish } = renderFlow();
    await user.click(screen.getByRole('button', { name: 'Migrate my vaults' }));
    await screen.findByRole('heading', { name: 'Migration interrupted' });

    // Act
    await user.click(screen.getByRole('button', { name: 'Continue without migrating' }));

    // Assert
    expect(onFinish).toHaveBeenCalledWith('kept-local');
    expect(window.localStorage.getItem(LOCAL_VAULT_DATA_KEY)).toBe(STORED_DATA);
    expect(window.localStorage.getItem(MIGRATION_RECORD_KEY)).toBeNull();
  });

  it('describes a single vault in the singular', async () => {
    // Arrange
    http.handler.mockResolvedValue(problemReply(400, 'Rejected'));
    const onFinish = vi.fn();
    const single = { ...DATA, vaults: [DATA.vaults[0]], folders: [], files: [] };
    render(<MigrationFlow data={single} onFinish={onFinish} />);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    // Act
    await user.click(screen.getByRole('button', { name: 'Migrate my vaults' }));
    await screen.findByRole('heading', { name: 'Migration interrupted' });

    // Assert
    expect(screen.getByText('Your vault is still on this device, unchanged.')).toBeInTheDocument();
  });
});
