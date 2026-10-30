import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AuthStatus,
  getAuthState,
  resetAuthState,
  startSession
} from '@/lib/auth/session/authSessionStore';
import { setEmailVerificationProvider } from '@/lib/auth/verification/emailVerification';
import { setErrorLogSink } from '@/lib/logging/logger';
import { LOCAL_VAULT_DATA_KEY, MIGRATION_RECORD_KEY } from '@/lib/migration/local/localVaultData';
import { FakeAtlasApi } from '@/test/FakeAtlasApi';
import { routerMock } from '@/test/navigationMock';
import { createLocalVaultData, storeLocalVaultData } from '@/test/vaultFixtures';
import { AuthEntry } from './AuthEntry';

const EMAIL = 'jd@example.com';
const PASSWORD = 'Valid-Passw0rd';
const HOUR = 3_600_000;
const CHECK_INTERVAL_MS = 3000;

let api: FakeAtlasApi;

type User = ReturnType<typeof userEvent.setup>;

function newUser(): User {
  return userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
}

async function signUp(user: User): Promise<void> {
  await user.click(await screen.findByRole('button', { name: 'Sign up' }));
  await user.type(screen.getByLabelText('Email'), EMAIL);
  await user.type(screen.getByLabelText('Password'), PASSWORD);
  await user.type(screen.getByLabelText('Confirm password'), PASSWORD);
  await user.click(screen.getByRole('button', { name: 'Create account' }));
}

async function advance(milliseconds: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(milliseconds);
  });
}

/**
 * Signs up, opens the emailed link as if in another tab of the same browser, and waits for the page to notice.
 */
async function signUpAndVerify(user: User): Promise<void> {
  await signUp(user);
  await screen.findByRole('dialog', { name: 'Check your inbox' });
  api.openVerificationLink(EMAIL);
  await advance(CHECK_INTERVAL_MS);
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  api = new FakeAtlasApi();
  api.install();
  setEmailVerificationProvider(null);
});

afterEach(() => {
  api.uninstall();
  resetAuthState();
  setEmailVerificationProvider(null);
  setErrorLogSink(null);
  routerMock.push.mockReset();
  routerMock.replace.mockReset();
  window.localStorage.clear();
  vi.useRealTimers();
});

describe('AuthEntry for an anonymous visitor', () => {
  it('shows nothing while it checks for a session, then offers sign up', async () => {
    // Arrange
    render(<AuthEntry />);

    // Act
    const hasButtonImmediately = screen.queryByRole('button', { name: 'Sign up' }) !== null;
    const button = await screen.findByRole('button', { name: 'Sign up' });

    // Assert
    expect(hasButtonImmediately).toBe(false);
    expect(button).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(api.countRequests('/auth/session')).toBe(1);
  });

  it('opens the signup modal and closes it again', async () => {
    // Arrange
    const user = newUser();
    render(<AuthEntry />);

    // Act
    await user.click(await screen.findByRole('button', { name: 'Sign up' }));
    const wasOpen = screen.queryByRole('dialog') !== null;
    await user.click(screen.getByRole('button', { name: 'Close' }));

    // Assert
    expect(wasOpen).toBe(true);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes the modal, shows the account badge and a log-out button, and confirms with a toast after signup', async () => {
    // Arrange
    const user = newUser();
    render(<AuthEntry />);

    // Act
    await signUpAndVerify(user);

    // Assert
    expect(await screen.findByRole('img', { name: `Signed in as ${EMAIL}` })).toHaveTextContent(
      'JD'
    );
    expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sign up' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Account created');
    expect(getAuthState().status).toBe(AuthStatus.authenticated);
  });

  it('keeps showing sign up and no badge when signup fails', async () => {
    // Arrange
    api.addAccount(EMAIL, 'Existing-Passw0rd');
    const user = newUser();
    render(<AuthEntry />);

    // Act
    await signUp(user);

    // Assert
    await screen.findByRole('alert');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /signed in as/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('dismisses the toast from its close button', async () => {
    // Arrange
    const user = newUser();
    render(<AuthEntry />);
    await signUpAndVerify(user);
    await screen.findByRole('status');

    // Act
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));

    // Assert
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
  });
});

describe('AuthEntry for a signed-in user', () => {
  it('restores the session from the cookie after a reload, with no sign-up button', async () => {
    // Arrange
    api.signInAs(api.addAccount(EMAIL, PASSWORD));

    // Act
    render(<AuthEntry />);

    // Assert
    expect(await screen.findByRole('img', { name: `Signed in as ${EMAIL}` })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sign up' })).not.toBeInTheDocument();
  });

  it('logs out: asks the server to end the session, shows sign up again and goes home', async () => {
    // Arrange
    api.signInAs(api.addAccount(EMAIL, PASSWORD));
    const user = newUser();
    render(<AuthEntry />);

    // Act
    await user.click(await screen.findByRole('button', { name: 'Log out' }));

    // Assert
    expect(await screen.findByRole('button', { name: 'Sign up' })).toBeInTheDocument();
    expect(api.countRequests('/auth/logout')).toBe(1);
    expect(api.getSessionUserId()).toBeNull();
    expect(getAuthState()).toMatchObject({ status: AuthStatus.anonymous, endReason: 'signed-out' });
    expect(routerMock.push).toHaveBeenCalledWith('/');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('stays signed in and says so when the server cannot be reached to log out', async () => {
    // Arrange
    setErrorLogSink(vi.fn());
    api.signInAs(api.addAccount(EMAIL, PASSWORD));
    const user = newUser();
    render(<AuthEntry />);
    const logOut = await screen.findByRole('button', { name: 'Log out' });
    api.setNetworkDown(true);

    // Act
    await user.click(logOut);

    // Assert
    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't log you out");
    expect(screen.getByRole('img', { name: `Signed in as ${EMAIL}` })).toBeInTheDocument();
    expect(getAuthState().status).toBe(AuthStatus.authenticated);
    expect(routerMock.push).not.toHaveBeenCalled();
  });

  it('signs the user out and tells them when the session expires', async () => {
    // Arrange
    render(<AuthEntry />);
    await screen.findByRole('button', { name: 'Sign up' });
    act(() => startSession({ id: 'user-1', email: EMAIL }, Date.now() + HOUR));
    await screen.findByRole('img', { name: `Signed in as ${EMAIL}` });

    // Act
    await advance(HOUR);

    // Assert
    expect(await screen.findByRole('button', { name: 'Sign up' })).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /signed in as/i })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Session expired');
  });

  it('announces an expiry even while the "Account created" toast is still showing', async () => {
    // Arrange
    api.setSessionSeconds(5);
    const user = newUser();
    render(<AuthEntry />);
    await signUpAndVerify(user);
    await screen.findByText('Account created');

    // Act
    await advance(5000);

    // Assert
    expect(await screen.findByRole('button', { name: 'Sign up' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Session expired');
    expect(screen.queryByText('Account created')).not.toBeInTheDocument();
  });

  it('does not bring the welcome toast back after the expiry notice is dismissed', async () => {
    // Arrange
    api.setSessionSeconds(5);
    const user = newUser();
    render(<AuthEntry />);
    await signUpAndVerify(user);
    await screen.findByText('Account created');
    await advance(5000);
    await screen.findByText('Session expired');

    // Act
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));

    // Assert
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
  });

  it('dismisses the session-expired notice and does not bring it back', async () => {
    // Arrange
    const user = newUser();
    render(<AuthEntry />);
    await screen.findByRole('button', { name: 'Sign up' });
    act(() => startSession({ id: 'user-1', email: EMAIL }, Date.now() + HOUR));
    await advance(HOUR);
    await screen.findByRole('status');

    // Act
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));

    // Assert
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
  });
});

describe('AuthEntry migration', () => {
  it('skips the migration prompt when there is no local data', async () => {
    // Arrange
    const user = newUser();
    render(<AuthEntry />);

    // Act
    await signUpAndVerify(user);

    // Assert
    expect(await screen.findByRole('status')).toHaveTextContent(
      "You're signed in and ready to go."
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('offers to migrate local vaults after signup instead of showing the toast', async () => {
    // Arrange
    storeLocalVaultData(createLocalVaultData());
    const user = newUser();
    render(<AuthEntry />);

    // Act
    await signUpAndVerify(user);

    // Assert
    expect(
      await screen.findByRole('dialog', { name: 'Move your vaults to your account?' })
    ).toHaveTextContent('3 vaults · 4 notes · 2 canvases');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(getAuthState().status).toBe(AuthStatus.authenticated);
  });

  it('keeps the data local and says so when the user declines', async () => {
    // Arrange
    storeLocalVaultData(createLocalVaultData());
    const user = newUser();
    render(<AuthEntry />);
    await signUpAndVerify(user);

    // Act
    await user.click(await screen.findByRole('button', { name: 'Keep on this device only' }));

    // Assert
    expect(screen.getByRole('status')).toHaveTextContent(
      "Your local vaults stay on this device and aren't linked to your account."
    );
    expect(api.countRequests('/vaults/migrate')).toBe(0);
    expect(window.localStorage.getItem(MIGRATION_RECORD_KEY)).toBeNull();
  });

  it('migrates the vaults when the user confirms and finishes without the toast', async () => {
    // Arrange
    storeLocalVaultData(createLocalVaultData());
    const user = newUser();
    render(<AuthEntry />);
    await signUpAndVerify(user);

    // Act
    await user.click(await screen.findByRole('button', { name: 'Migrate my vaults' }));
    await user.click(await screen.findByRole('button', { name: 'Open my vaults' }));

    // Assert
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(window.localStorage.getItem(MIGRATION_RECORD_KEY)).toContain('a0000000');
    expect(window.localStorage.getItem(LOCAL_VAULT_DATA_KEY)).not.toBeNull();
  });
});

describe('AuthEntry email verification', () => {
  it('asks the user to check their inbox, without signing them in or sending a second email', async () => {
    // Arrange
    storeLocalVaultData(createLocalVaultData());
    const user = newUser();
    render(<AuthEntry />);

    // Act
    await signUp(user);

    // Assert
    const dialog = await screen.findByRole('dialog', { name: 'Check your inbox' });
    expect(dialog).toHaveTextContent(EMAIL);
    expect(dialog).toHaveTextContent("Your local vaults haven't been touched");
    expect(api.countRequests('/auth/resend-verification')).toBe(0);
    expect(api.getSessionUserId()).toBeNull();
    expect(getAuthState().status).toBe(AuthStatus.anonymous);
    expect(screen.queryByRole('img', { name: /signed in as/i })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('dialog', { name: 'Move your vaults to your account?' })
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('keeps waiting while the link has not been opened', async () => {
    // Arrange
    const user = newUser();
    render(<AuthEntry />);
    await signUp(user);
    await screen.findByRole('dialog', { name: 'Check your inbox' });

    // Act
    await advance(CHECK_INTERVAL_MS * 2);

    // Assert
    expect(screen.getByRole('dialog', { name: 'Check your inbox' })).toBeInTheDocument();
    expect(getAuthState().status).toBe(AuthStatus.anonymous);
  });

  it('signs the user in and carries on to the migration prompt once the link is opened', async () => {
    // Arrange
    storeLocalVaultData(createLocalVaultData());
    const user = newUser();
    render(<AuthEntry />);

    // Act
    await signUpAndVerify(user);

    // Assert
    expect(
      await screen.findByRole('dialog', { name: 'Move your vaults to your account?' })
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Check your inbox' })).not.toBeInTheDocument();
    expect(getAuthState().session?.user.email).toBe(EMAIL);
  });

  it('asks for a new link for the address the user signed up with', async () => {
    // Arrange
    const user = newUser();
    render(<AuthEntry />);
    await signUp(user);
    await screen.findByRole('dialog', { name: 'Check your inbox' });
    const firstToken = api.getVerificationToken(EMAIL);
    await advance(30_000);

    // Act
    await user.click(await screen.findByRole('button', { name: 'Resend email' }));

    // Assert
    await waitFor(() => expect(api.countRequests('/auth/resend-verification')).toBe(1));
    expect(api.requests.at(-1)?.body).toEqual({ email: EMAIL });
    expect(api.getVerificationToken(EMAIL)).not.toBe(firstToken);
  });

  it('reopens the signup form when the user wants a different email, with nothing to sign out of', async () => {
    // Arrange
    const user = newUser();
    render(<AuthEntry />);
    await signUp(user);
    await screen.findByRole('dialog', { name: 'Check your inbox' });

    // Act
    await user.click(screen.getByRole('button', { name: 'Use a different email' }));

    // Assert
    expect(await screen.findByRole('dialog', { name: 'Create your account' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Check your inbox' })).not.toBeInTheDocument();
    expect(api.countRequests('/auth/logout')).toBe(0);
  });
});
