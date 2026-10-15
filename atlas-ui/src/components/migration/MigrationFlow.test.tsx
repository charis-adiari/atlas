import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearSession, saveSession } from '@/lib/auth/session/authSessionStore';
import { LOCAL_VAULT_DATA_KEY, MIGRATION_RECORD_KEY } from '@/lib/migration/local/localVaultData';
import type { MigrationRequest } from '@/types/migration';
import { MigrationFlow } from './MigrationFlow';

const DATA: MigrationRequest = {
  vaults: [
    { id: 'v1', name: 'Personal', createdAt: '2026-01-01T00:00:00Z' },
    { id: 'v2', name: 'Work ideas' }
  ],
  folders: [{ id: 'f1', vaultId: 'v1', parentFolderId: null, name: 'Inbox' }],
  files: [
    {
      id: 'n1',
      vaultId: 'v1',
      folderId: 'f1',
      type: 'note',
      name: 'Weekly review',
      content: '# Hi'
    },
    { id: 'c1', vaultId: 'v2', folderId: null, type: 'canvas', name: 'Mind map', content: '{}' }
  ],
  backlinks: []
};
const STORED_DATA = JSON.stringify(DATA);

const fetchMock = vi.fn<typeof fetch>();

function created(): Response {
  return new Response(JSON.stringify({ vaults: 2, folders: 1, files: 2, backlinks: 0 }), {
    status: 201
  });
}

function problem(status: number, detail: string): Response {
  return new Response(JSON.stringify({ statusCode: status, title: 'Problem', detail }), { status });
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
  fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
  await user.click(screen.getByRole('button', { name: 'Migrate my vaults' }));
  await screen.findByText(/Retrying \(attempt 2 of 3\)/);
  await advance(1000);
  await screen.findByText(/Retrying \(attempt 3 of 3\)/);
  await advance(2000);
  await screen.findByRole('heading', { name: 'Migration interrupted' });
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.stubGlobal('fetch', fetchMock);
  window.localStorage.setItem(LOCAL_VAULT_DATA_KEY, STORED_DATA);
  saveSession({
    user: { id: 'user-1', email: 'jd@example.com' },
    accessToken: 'jwt-token',
    tokenType: 'Bearer',
    expiresIn: 3600
  });
});

afterEach(() => {
  clearSession();
  window.localStorage.clear();
  fetchMock.mockReset();
  vi.unstubAllGlobals();
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
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does nothing but report that the data stays local when the user declines', async () => {
    // Arrange
    const { user, onFinish } = renderFlow();

    // Act
    await user.click(screen.getByRole('button', { name: 'Keep on this device only' }));

    // Assert
    expect(onFinish).toHaveBeenCalledWith('kept-local');
    expect(fetchMock).not.toHaveBeenCalled();
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
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('MigrationFlow upload', () => {
  it('uploads everything in one request as the signed-in user', async () => {
    // Arrange
    fetchMock.mockResolvedValue(created());
    const { user } = renderFlow();

    // Act
    await user.click(screen.getByRole('button', { name: 'Migrate my vaults' }));
    await screen.findByRole('heading', { name: 'Your vaults are backed up' });

    // Assert
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/v1/vaults/migrate');
    expect(init?.headers).toMatchObject({ Authorization: 'Bearer jwt-token' });
    expect(JSON.parse(init?.body as string)).toEqual(DATA);
  });

  it('shows progress that cannot be dismissed while the upload is running', async () => {
    // Arrange
    fetchMock.mockReturnValue(new Promise(() => undefined));
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
    let confirm: (response: Response) => void = () => undefined;
    fetchMock.mockReturnValue(new Promise<Response>((resolve) => (confirm = resolve)));
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
    fetchMock.mockResolvedValue(created());
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
    expect(fetchMock).toHaveBeenCalledTimes(3);
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
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(created());

    // Act
    await user.click(screen.getByRole('button', { name: 'Retry migration' }));
    await screen.findByRole('heading', { name: 'Your vaults are backed up' });

    // Assert
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem(MIGRATION_RECORD_KEY)).not.toBeNull();
  });

  it('counts a conflict on retry as the earlier upload having gone through', async () => {
    // Arrange
    const { user } = renderFlow();
    await failThreeTimes(user);
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(problem(409, 'Some of this data has already been migrated.'));

    // Act
    await user.click(screen.getByRole('button', { name: 'Retry migration' }));
    await screen.findByRole('heading', { name: 'Your vaults are backed up' });

    // Assert
    expect(window.localStorage.getItem(MIGRATION_RECORD_KEY)).not.toBeNull();
  });

  it('does not retry data the server rejected and shows its message without a retry button', async () => {
    // Arrange
    fetchMock.mockResolvedValue(problem(400, 'Folder f1 points at a missing parent.'));
    const { user } = renderFlow();

    // Act
    await user.click(screen.getByRole('button', { name: 'Migrate my vaults' }));
    await screen.findByRole('heading', { name: 'Migration interrupted' });

    // Assert
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('alert')).toHaveTextContent('Folder f1 points at a missing parent.');
    expect(screen.getAllByText('Not uploaded')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Retry migration' })).not.toBeInTheDocument();
    expect(window.localStorage.getItem(MIGRATION_RECORD_KEY)).toBeNull();
  });

  it('reports a conflict on a first attempt as a failure', async () => {
    // Arrange
    fetchMock.mockResolvedValue(problem(409, 'Some of this data has already been migrated.'));
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
    clearSession();

    // Act
    await user.click(screen.getByRole('button', { name: 'Migrate my vaults' }));
    await screen.findByRole('heading', { name: 'Migration interrupted' });

    // Assert
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Your session has expired');
  });

  it('lets the user continue without migrating, leaving the data local', async () => {
    // Arrange
    fetchMock.mockResolvedValue(problem(400, 'Rejected'));
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
    fetchMock.mockResolvedValue(problem(400, 'Rejected'));
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
