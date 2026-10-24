import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getAuthState, resetAuthState } from '@/lib/auth/session/authSessionStore';
import { ACCOUNT_NOT_CREATED_MESSAGE, INVALID_DETAILS_MESSAGE } from '@/lib/auth/signupErrors';
import { setErrorLogSink } from '@/lib/logging/logger';
import { LOCAL_VAULT_DATA_KEY, MIGRATION_RECORD_KEY } from '@/lib/migration/local/localVaultData';
import { FakeAtlasApi } from '@/test/FakeAtlasApi';
import {
  LOCAL_VAULT_SUMMARY_TEXT,
  createLocalVaultData,
  storeLocalVaultData
} from '@/test/vaultFixtures';
import { AuthEntry } from './AuthEntry';

const EMAIL = 'jd@example.com';
const PASSWORD = 'Valid-Passw0rd';
const SIGNUP_PATH = '/auth/signup';
const MIGRATE_PATH = '/vaults/migrate';
const PROMPT_TITLE = 'Move your vaults to your account?';
const BACKED_UP_TITLE = 'Your vaults are backed up';
const INTERRUPTED_TITLE = 'Migration interrupted';

let api: FakeAtlasApi;

type User = ReturnType<typeof userEvent.setup>;

/**
 * Opens the signup form from the header and submits the given credentials, as a person would.
 */
async function createAccount(
  user: User,
  email = EMAIL,
  password = PASSWORD,
  confirmation = password
): Promise<void> {
  await user.click(await screen.findByRole('button', { name: 'Sign up' }));
  await user.type(screen.getByLabelText('Email'), email);
  await user.type(screen.getByLabelText('Password'), password);
  await user.type(screen.getByLabelText('Confirm password'), confirmation);
  await user.click(screen.getByRole('button', { name: 'Create account' }));
}

/**
 * Lets time pass, which is what the pauses between migration attempts wait for.
 */
async function advance(milliseconds: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(milliseconds);
  });
}

/**
 * Signs up and confirms the migration prompt, leaving the migration under way.
 */
async function signUpAndConfirmMigration(user: User): Promise<void> {
  await createAccount(user);
  await user.click(await screen.findByRole('button', { name: 'Migrate my vaults' }));
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  api = new FakeAtlasApi();
  api.install();
});

afterEach(() => {
  api.uninstall();
  resetAuthState();
  setErrorLogSink(null);
  window.localStorage.clear();
  vi.useRealTimers();
});

describe('US-02 AC1: valid signup creates an account', () => {
  it('Given an anonymous user, when they submit valid credentials, then an account is created and they are signed in', async () => {
    // Arrange
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<AuthEntry />);
    expect(getAuthState().session).toBeNull();

    // Act
    await createAccount(user, '  JD@Example.com ');

    // Assert
    const badge = await screen.findByRole('img', { name: `Signed in as ${EMAIL}` });
    const account = api.findAccount(EMAIL);
    expect(badge).toBeInTheDocument();
    expect(account).toBeDefined();
    expect(api.countRequests(SIGNUP_PATH)).toBe(1);
    expect(api.requests.find((request) => request.path === SIGNUP_PATH)?.body).toEqual({
      email: EMAIL,
      password: PASSWORD
    });
    expect(getAuthState().session?.user).toEqual({ id: account?.id, email: EMAIL });
    expect(screen.queryByRole('button', { name: 'Sign up' })).not.toBeInTheDocument();
  });

  it('keeps the session in a cookie the page cannot read, and no token anywhere in the page', async () => {
    // Arrange
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<AuthEntry />);

    // Act
    await createAccount(user);
    await screen.findByRole('img', { name: `Signed in as ${EMAIL}` });

    // Assert
    expect(api.getSessionUserId()).toBe(api.findAccount(EMAIL)?.id);
    expect(JSON.stringify({ ...window.localStorage })).not.toMatch(/token|jwt|session/i);
    expect(JSON.stringify(getAuthState())).not.toMatch(/token|jwt/i);
    expect(api.requests.every((request) => !('authorization' in request.headers))).toBe(true);
  });

  it('goes straight to the signed-in state, with no migration prompt, when there is no local data', async () => {
    // Arrange
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<AuthEntry />);

    // Act
    await createAccount(user);

    // Assert
    expect(await screen.findByRole('status')).toHaveTextContent(
      "You're signed in and ready to go."
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(api.countRequests(MIGRATE_PATH)).toBe(0);
  });
});

describe('US-02 step 4: the migration prompt appears when local data exists', () => {
  it('Given local vault data, when signup completes, then the user is asked whether to migrate it', async () => {
    // Arrange
    const storedData = storeLocalVaultData(createLocalVaultData());
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<AuthEntry />);

    // Act
    await createAccount(user);

    // Assert
    const prompt = await screen.findByRole('dialog', { name: PROMPT_TITLE });
    expect(prompt).toHaveTextContent(LOCAL_VAULT_SUMMARY_TEXT);
    expect(within(prompt).getByRole('button', { name: 'Migrate my vaults' })).toBeInTheDocument();
    expect(
      within(prompt).getByRole('button', { name: 'Keep on this device only' })
    ).toBeInTheDocument();
    expect(getAuthState().session).not.toBeNull();
    expect(api.countRequests(MIGRATE_PATH)).toBe(0);
    expect(window.localStorage.getItem(LOCAL_VAULT_DATA_KEY)).toBe(storedData);
  });

  it('does not prompt for vaults that were already migrated', async () => {
    // Arrange
    const data = createLocalVaultData();
    storeLocalVaultData(data);
    window.localStorage.setItem(
      MIGRATION_RECORD_KEY,
      JSON.stringify({
        userId: 'earlier-user',
        migratedAt: '2026-01-01T00:00:00Z',
        vaultIds: data.vaults.map((vault) => vault.id)
      })
    );
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<AuthEntry />);

    // Act
    await createAccount(user);

    // Assert
    expect(await screen.findByRole('status')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('US-02 step 5 and 6: confirming uploads all vaults and ties them to the account', () => {
  it('Given the prompt, when the user confirms, then every vault is stored under the new account', async () => {
    // Arrange
    const data = createLocalVaultData();
    storeLocalVaultData(data);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<AuthEntry />);

    // Act
    await signUpAndConfirmMigration(user);
    await screen.findByRole('dialog', { name: BACKED_UP_TITLE });

    // Assert
    const account = api.findAccount(EMAIL);
    expect(api.getVaultsOf(account?.id ?? '')).toEqual(data);
    expect(api.getVaultOwnerIds()).toEqual([account?.id]);
  });

  it("uploads in a single request authenticated by the new account's session cookie, with a CSRF token", async () => {
    // Arrange
    storeLocalVaultData(createLocalVaultData());
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<AuthEntry />);

    // Act
    await signUpAndConfirmMigration(user);
    await screen.findByRole('dialog', { name: BACKED_UP_TITLE });

    // Assert
    const migrateRequests = api.requests.filter((request) => request.path === MIGRATE_PATH);
    expect(migrateRequests).toHaveLength(1);
    expect(migrateRequests[0].headers).not.toHaveProperty('authorization');
    expect(migrateRequests[0].headers['x-csrf-token']).toBe('test-csrf-token');
    expect(api.getVaultOwnerIds()).toEqual([api.findAccount(EMAIL)?.id]);
  });

  it('confirms the backup, records which vaults were migrated, and keeps the local copy', async () => {
    // Arrange
    const data = createLocalVaultData();
    const storedData = storeLocalVaultData(data);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<AuthEntry />);

    // Act
    await signUpAndConfirmMigration(user);
    const confirmation = await screen.findByRole('dialog', { name: BACKED_UP_TITLE });
    await user.click(within(confirmation).getByRole('button', { name: 'Open my vaults' }));

    // Assert
    expect(confirmation).toHaveTextContent('All 3 vaults are now linked to your account.');
    const record = JSON.parse(window.localStorage.getItem(MIGRATION_RECORD_KEY) ?? 'null');
    expect(record.userId).toBe(api.findAccount(EMAIL)?.id);
    expect(record.vaultIds).toEqual(data.vaults.map((vault) => vault.id));
    expect(window.localStorage.getItem(LOCAL_VAULT_DATA_KEY)).toBe(storedData);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('US-02 step 5.1: declining creates the account without moving data', () => {
  it('Given the prompt, when the user declines, then the account exists and nothing is uploaded', async () => {
    // Arrange
    const storedData = storeLocalVaultData(createLocalVaultData());
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<AuthEntry />);
    await createAccount(user);

    // Act
    await user.click(await screen.findByRole('button', { name: 'Keep on this device only' }));

    // Assert
    expect(api.findAccount(EMAIL)).toBeDefined();
    expect(getAuthState().session?.user.email).toBe(EMAIL);
    expect(screen.getByRole('img', { name: `Signed in as ${EMAIL}` })).toBeInTheDocument();
    expect(api.countRequests(MIGRATE_PATH)).toBe(0);
    expect(api.getVaultOwnerIds()).toEqual([]);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      "Your local vaults stay on this device and aren't linked to your account."
    );
    expect(window.localStorage.getItem(LOCAL_VAULT_DATA_KEY)).toBe(storedData);
    expect(window.localStorage.getItem(MIGRATION_RECORD_KEY)).toBeNull();
  });
});

describe('US-02 step 3.1 / AC3: a failed signup shows an error and the user stays anonymous', () => {
  it('Given an account with this email, when the user signs up with it, then an error is shown and they stay anonymous', async () => {
    // Arrange
    api.addAccount(EMAIL, 'Existing-Passw0rd');
    const storedData = storeLocalVaultData(createLocalVaultData());
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<AuthEntry />);

    // Act
    await createAccount(user, '  JD@Example.com ');

    // Assert
    const dialog = await screen.findByRole('dialog', { name: 'Create your account' });
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(ACCOUNT_NOT_CREATED_MESSAGE);
    expect(getAuthState().session).toBeNull();
    expect(JSON.stringify({ ...window.localStorage })).not.toMatch(/token|jwt|session/i);
    expect(screen.queryByRole('img', { name: /signed in as/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign up' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: PROMPT_TITLE })).not.toBeInTheDocument();
    expect(api.countRequests(MIGRATE_PATH)).toBe(0);
    expect(window.localStorage.getItem(LOCAL_VAULT_DATA_KEY)).toBe(storedData);
  });

  it('keeps what the user typed so they can fix it and try again', async () => {
    // Arrange
    api.addAccount(EMAIL, 'Existing-Passw0rd');
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<AuthEntry />);

    // Act
    await createAccount(user);
    await screen.findByRole('alert');

    // Assert
    expect(screen.getByLabelText('Email')).toHaveValue(EMAIL);
    expect(screen.getByLabelText('Password')).toHaveValue(PASSWORD);
    expect(screen.getByRole('button', { name: 'Create account' })).toBeEnabled();
  });

  it('Given a weak password, when the user types it, then signup cannot be submitted and they stay anonymous', async () => {
    // Arrange
    const storedData = storeLocalVaultData(createLocalVaultData());
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<AuthEntry />);
    await user.click(await screen.findByRole('button', { name: 'Sign up' }));
    await user.type(screen.getByLabelText('Email'), EMAIL);

    // Act
    await user.type(screen.getByLabelText('Password'), 'weakpass{Enter}');

    // Assert
    expect(screen.getByRole('button', { name: 'Create account' })).toBeDisabled();
    expect(screen.getByText('One uppercase letter').textContent).toContain('(not met)');
    expect(screen.getByText('One digit').textContent).toContain('(not met)');
    expect(screen.getByText('One special character').textContent).toContain('(not met)');
    expect(api.countRequests(SIGNUP_PATH)).toBe(0);
    expect(getAuthState().session).toBeNull();
    expect(window.localStorage.getItem(LOCAL_VAULT_DATA_KEY)).toBe(storedData);
  });

  it('Given the two passwords differ, when the user tries to submit, then they are told, nothing is sent and they stay anonymous', async () => {
    // Arrange
    const storedData = storeLocalVaultData(createLocalVaultData());
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<AuthEntry />);
    await user.click(await screen.findByRole('button', { name: 'Sign up' }));
    await user.type(screen.getByLabelText('Email'), EMAIL);
    await user.type(screen.getByLabelText('Password'), PASSWORD);

    // Act
    await user.type(screen.getByLabelText('Confirm password'), `${PASSWORD}x{Enter}`);

    // Assert
    expect(screen.getByText("Passwords don't match")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create account' })).toBeDisabled();
    expect(api.countRequests(SIGNUP_PATH)).toBe(0);
    expect(getAuthState().session).toBeNull();
    expect(window.localStorage.getItem(LOCAL_VAULT_DATA_KEY)).toBe(storedData);
  });

  it('Given the server rejects a password the form accepted, when the user submits, then its error is shown and they stay anonymous', async () => {
    // Arrange
    api.rejectPassword('Password1!');
    const storedData = storeLocalVaultData(createLocalVaultData());
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<AuthEntry />);

    // Act
    await createAccount(user, EMAIL, 'Password1!');

    // Assert
    const dialog = await screen.findByRole('dialog', { name: 'Create your account' });
    expect(await within(dialog).findByText('Password is too weak')).toBeInTheDocument();
    expect(within(dialog).getByRole('alert')).toHaveTextContent(INVALID_DETAILS_MESSAGE);
    expect(api.findAccount(EMAIL)).toBeUndefined();
    expect(getAuthState().session).toBeNull();
    expect(JSON.stringify({ ...window.localStorage })).not.toMatch(/token|jwt|session/i);
    expect(window.localStorage.getItem(LOCAL_VAULT_DATA_KEY)).toBe(storedData);
  });
});

describe('US-02 step 6.1 / AC4: a network failure during migration retries or rolls back and preserves local data', () => {
  it('Given a connection that drops briefly, when migration is in progress, then it retries on its own and completes', async () => {
    // Arrange
    const data = createLocalVaultData();
    const storedData = storeLocalVaultData(data);
    api.queueMigrationFaults('network-error', 'network-error');
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<AuthEntry />);

    // Act
    await signUpAndConfirmMigration(user);
    await screen.findByText(/Retrying \(attempt 2 of 3\)/);
    await advance(1000);
    await screen.findByText(/Retrying \(attempt 3 of 3\)/);
    await advance(2000);
    await screen.findByRole('dialog', { name: BACKED_UP_TITLE });

    // Assert
    expect(api.countRequests(MIGRATE_PATH)).toBe(3);
    expect(api.getVaultsOf(api.findAccount(EMAIL)?.id ?? '')).toEqual(data);
    expect(window.localStorage.getItem(LOCAL_VAULT_DATA_KEY)).toBe(storedData);
    expect(window.localStorage.getItem(MIGRATION_RECORD_KEY)).not.toBeNull();
  });

  it('Given a server error, when migration is in progress, then it retries and completes', async () => {
    // Arrange
    const data = createLocalVaultData();
    storeLocalVaultData(data);
    api.queueMigrationFaults('server-error');
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<AuthEntry />);

    // Act
    await signUpAndConfirmMigration(user);
    await screen.findByText(/Retrying \(attempt 2 of 3\)/);
    await advance(1000);
    await screen.findByRole('dialog', { name: BACKED_UP_TITLE });

    // Assert
    expect(api.countRequests(MIGRATE_PATH)).toBe(2);
    expect(api.getVaultsOf(api.findAccount(EMAIL)?.id ?? '')).toEqual(data);
  });

  it('Given a network that stays down, when retries run out, then nothing is stored, the user is told, and local data is preserved', async () => {
    // Arrange
    const storedData = storeLocalVaultData(createLocalVaultData());
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<AuthEntry />);
    await createAccount(user);
    await screen.findByRole('dialog', { name: PROMPT_TITLE });
    api.setNetworkDown(true);
    const attemptsBeforeOutage = api.http.attemptedPaths.length;

    // Act
    await user.click(screen.getByRole('button', { name: 'Migrate my vaults' }));
    await screen.findByText(/Retrying \(attempt 2 of 3\)/);
    await advance(1000);
    await screen.findByText(/Retrying \(attempt 3 of 3\)/);
    await advance(2000);
    const failure = await screen.findByRole('dialog', { name: INTERRUPTED_TITLE });

    // Assert
    expect(api.http.attemptedPaths.slice(attemptsBeforeOutage)).toEqual([
      '/auth/csrf',
      '/auth/csrf',
      '/auth/csrf'
    ]);
    expect(api.countRequests(MIGRATE_PATH)).toBe(0);
    expect(api.getVaultOwnerIds()).toEqual([]);
    expect(failure).toHaveTextContent('Connection lost while uploading');
    expect(failure).toHaveTextContent('Your local data is safe');
    expect(within(failure).getByRole('button', { name: 'Retry migration' })).toBeInTheDocument();
    expect(window.localStorage.getItem(LOCAL_VAULT_DATA_KEY)).toBe(storedData);
    expect(window.localStorage.getItem(MIGRATION_RECORD_KEY)).toBeNull();
    expect(getAuthState().session).not.toBeNull();
  });

  it('lets the user retry once the network is back, without duplicating anything', async () => {
    // Arrange
    const data = createLocalVaultData();
    storeLocalVaultData(data);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<AuthEntry />);
    await createAccount(user);
    await screen.findByRole('dialog', { name: PROMPT_TITLE });
    api.setNetworkDown(true);
    await user.click(screen.getByRole('button', { name: 'Migrate my vaults' }));
    await screen.findByText(/Retrying \(attempt 2 of 3\)/);
    await advance(1000);
    await screen.findByText(/Retrying \(attempt 3 of 3\)/);
    await advance(2000);
    await screen.findByRole('dialog', { name: INTERRUPTED_TITLE });
    api.setNetworkDown(false);

    // Act
    await user.click(screen.getByRole('button', { name: 'Retry migration' }));
    await screen.findByRole('dialog', { name: BACKED_UP_TITLE });

    // Assert
    expect(api.getVaultsOf(api.findAccount(EMAIL)?.id ?? '')).toEqual(data);
    expect(api.getVaultOwnerIds()).toHaveLength(1);
    expect(window.localStorage.getItem(MIGRATION_RECORD_KEY)).not.toBeNull();
  });

  it('Given the connection drops after the server stored the data, when the retry is refused as a duplicate, then it counts as done and nothing is duplicated', async () => {
    // Arrange
    const data = createLocalVaultData();
    const storedData = storeLocalVaultData(data);
    api.queueMigrationFaults('lost-response');
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<AuthEntry />);

    // Act
    await signUpAndConfirmMigration(user);
    await screen.findByText(/Retrying \(attempt 2 of 3\)/);
    await advance(1000);
    await screen.findByRole('dialog', { name: BACKED_UP_TITLE });

    // Assert
    expect(api.countRequests(MIGRATE_PATH)).toBe(2);
    expect(api.getVaultsOf(api.findAccount(EMAIL)?.id ?? '')).toEqual(data);
    expect(api.getVaultOwnerIds()).toHaveLength(1);
    expect(window.localStorage.getItem(LOCAL_VAULT_DATA_KEY)).toBe(storedData);
    expect(window.localStorage.getItem(MIGRATION_RECORD_KEY)).not.toBeNull();
  });

  it('Given a failed migration, when the user continues without migrating, then the account stays and local data is preserved', async () => {
    // Arrange
    const storedData = storeLocalVaultData(createLocalVaultData());
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<AuthEntry />);
    await createAccount(user);
    await screen.findByRole('dialog', { name: PROMPT_TITLE });
    api.setNetworkDown(true);
    await user.click(screen.getByRole('button', { name: 'Migrate my vaults' }));
    await screen.findByText(/Retrying \(attempt 2 of 3\)/);
    await advance(1000);
    await screen.findByText(/Retrying \(attempt 3 of 3\)/);
    await advance(2000);
    await screen.findByRole('dialog', { name: INTERRUPTED_TITLE });

    // Act
    await user.click(screen.getByRole('button', { name: 'Continue without migrating' }));

    // Assert
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: `Signed in as ${EMAIL}` })).toBeInTheDocument();
    expect(api.getVaultOwnerIds()).toEqual([]);
    expect(window.localStorage.getItem(LOCAL_VAULT_DATA_KEY)).toBe(storedData);
    expect(window.localStorage.getItem(MIGRATION_RECORD_KEY)).toBeNull();
  });
});

describe('logout ends the session', () => {
  it('Given a signed-in user, when they log out, then the server session is gone and they are anonymous again, even after a reload', async () => {
    // Arrange
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { unmount } = render(<AuthEntry />);
    await createAccount(user);
    await screen.findByRole('img', { name: `Signed in as ${EMAIL}` });

    // Act
    await user.click(screen.getByRole('button', { name: 'Log out' }));
    await screen.findByRole('button', { name: 'Sign up' });
    unmount();
    resetAuthState();
    render(<AuthEntry />);

    // Assert
    expect(await screen.findByRole('button', { name: 'Sign up' })).toBeInTheDocument();
    expect(api.getSessionUserId()).toBeNull();
    expect(screen.queryByRole('img', { name: /signed in as/i })).not.toBeInTheDocument();
  });

  it('Given a logged-out user, when something protected is attempted, then the server refuses it', async () => {
    // Arrange
    const storedData = storeLocalVaultData(createLocalVaultData());
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<AuthEntry />);
    await createAccount(user);
    await screen.findByRole('dialog', { name: PROMPT_TITLE });
    api.expireSession();

    // Act
    await user.click(screen.getByRole('button', { name: 'Migrate my vaults' }));
    const failure = await screen.findByRole('dialog', { name: INTERRUPTED_TITLE });

    // Assert
    expect(failure).toHaveTextContent('Your session has expired');
    expect(api.getVaultOwnerIds()).toEqual([]);
    expect(window.localStorage.getItem(LOCAL_VAULT_DATA_KEY)).toBe(storedData);
  });
});

describe('token expiry', () => {
  it('Given a signed-in user, when the token reaches its expiry, then they are signed out and told why', async () => {
    // Arrange
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<AuthEntry />);
    await createAccount(user);
    await screen.findByRole('img', { name: `Signed in as ${EMAIL}` });

    // Act
    await advance(3_600_000);

    // Assert
    expect(await screen.findByRole('button', { name: 'Sign up' })).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /signed in as/i })).not.toBeInTheDocument();
    expect(getAuthState()).toMatchObject({ status: 'anonymous', endReason: 'expired' });
    expect(screen.getByRole('status')).toHaveTextContent('Session expired');
  });

  it('Given an expired token, when the user reloads, then they are anonymous and nothing is restored', async () => {
    // Arrange
    api.signInAs(api.addAccount(EMAIL, PASSWORD));
    api.expireSession();

    // Act
    render(<AuthEntry />);

    // Assert
    expect(await screen.findByRole('button', { name: 'Sign up' })).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /signed in as/i })).not.toBeInTheDocument();
  });

  it('Given a migration in progress, when the token has expired on the server, then the user is signed out, nothing is stored and local data is preserved', async () => {
    // Arrange
    const storedData = storeLocalVaultData(createLocalVaultData());
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<AuthEntry />);
    await createAccount(user);
    await screen.findByRole('dialog', { name: PROMPT_TITLE });
    api.expireSession();

    // Act
    await user.click(screen.getByRole('button', { name: 'Migrate my vaults' }));
    await screen.findByRole('dialog', { name: INTERRUPTED_TITLE });

    // Assert
    expect(getAuthState()).toMatchObject({ status: 'anonymous', endReason: 'expired' });
    expect(api.countRequests(MIGRATE_PATH)).toBe(1);
    expect(api.getVaultOwnerIds()).toEqual([]);
    expect(window.localStorage.getItem(LOCAL_VAULT_DATA_KEY)).toBe(storedData);
    expect(window.localStorage.getItem(MIGRATION_RECORD_KEY)).toBeNull();
  });
});
