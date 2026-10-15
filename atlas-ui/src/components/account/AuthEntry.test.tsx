import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearSession, getSession, saveSession } from '@/lib/auth/session/authSessionStore';
import { LOCAL_VAULT_DATA_KEY, MIGRATION_RECORD_KEY } from '@/lib/migration/local/localVaultData';
import type { SignupResponse } from '@/types/auth';
import { AuthEntry } from './AuthEntry';

const SIGNUP_RESPONSE: SignupResponse = {
  user: { id: 'user-1', email: 'jd@example.com' },
  accessToken: 'jwt-token',
  tokenType: 'Bearer',
  expiresIn: 3600
};

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  clearSession();
  window.localStorage.clear();
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

async function signUp(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Sign up' }));
  await user.type(screen.getByLabelText('Email'), 'jd@example.com');
  await user.type(screen.getByLabelText('Password'), 'Valid-Passw0rd');
  await user.type(screen.getByLabelText('Confirm password'), 'Valid-Passw0rd');
  await user.click(screen.getByRole('button', { name: 'Create account' }));
}

describe('AuthEntry', () => {
  it('offers sign up to an anonymous user without opening the modal', () => {
    // Arrange
    render(<AuthEntry />);

    // Act
    const button = screen.getByRole('button', { name: 'Sign up' });

    // Assert
    expect(button).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the signup modal and closes it again', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<AuthEntry />);

    // Act
    await user.click(screen.getByRole('button', { name: 'Sign up' }));
    const wasOpen = screen.queryByRole('dialog') !== null;
    await user.click(screen.getByRole('button', { name: 'Close' }));

    // Assert
    expect(wasOpen).toBe(true);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes the modal, shows the account badge and confirms with a toast after signup', async () => {
    // Arrange
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(SIGNUP_RESPONSE), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      })
    );
    const user = userEvent.setup();
    render(<AuthEntry />);

    // Act
    await signUp(user);

    // Assert
    expect(
      await screen.findByRole('img', { name: 'Signed in as jd@example.com' })
    ).toHaveTextContent('JD');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sign up' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Account created');
    expect(getSession()?.accessToken).toBe('jwt-token');
  });

  it('keeps showing sign up and no badge when signup fails', async () => {
    // Arrange
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ detail: 'An account with this email already exists.' }), {
        status: 409
      })
    );
    const user = userEvent.setup();
    render(<AuthEntry />);

    // Act
    await signUp(user);

    // Assert
    await screen.findByRole('alert');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /signed in as/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows the account badge straight away for a user who is already signed in', () => {
    // Arrange
    saveSession(SIGNUP_RESPONSE);

    // Act
    render(<AuthEntry />);

    // Assert
    expect(screen.getByRole('img', { name: 'Signed in as jd@example.com' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sign up' })).not.toBeInTheDocument();
  });

  it('dismisses the toast from its close button', async () => {
    // Arrange
    fetchMock.mockResolvedValue(new Response(JSON.stringify(SIGNUP_RESPONSE), { status: 201 }));
    const user = userEvent.setup();
    render(<AuthEntry />);
    await signUp(user);
    await screen.findByRole('status');

    // Act
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));

    // Assert
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
  });
});

describe('AuthEntry migration', () => {
  const LOCAL_DATA = {
    vaults: [{ id: 'v1', name: 'Personal' }],
    folders: [],
    files: [{ id: 'n1', vaultId: 'v1', type: 'note', name: 'Weekly review' }],
    backlinks: []
  };

  function answerRequests(migrateResponse: Response) {
    fetchMock.mockImplementation(async (url) =>
      String(url).endsWith('/auth/signup')
        ? new Response(JSON.stringify(SIGNUP_RESPONSE), { status: 201 })
        : migrateResponse
    );
  }

  it('skips the migration prompt and welcomes the user when there is no local data', async () => {
    // Arrange
    answerRequests(new Response(null, { status: 500 }));
    const user = userEvent.setup();
    render(<AuthEntry />);

    // Act
    await signUp(user);

    // Assert
    expect(await screen.findByRole('status')).toHaveTextContent(
      "You're signed in and ready to go."
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('offers to migrate local vaults after signup instead of showing the toast', async () => {
    // Arrange
    window.localStorage.setItem(LOCAL_VAULT_DATA_KEY, JSON.stringify(LOCAL_DATA));
    answerRequests(new Response(null, { status: 500 }));
    const user = userEvent.setup();
    render(<AuthEntry />);

    // Act
    await signUp(user);

    // Assert
    expect(
      await screen.findByRole('dialog', { name: 'Move your vaults to your account?' })
    ).toHaveTextContent('1 vault · 1 note · 0 canvases');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(getSession()).not.toBeNull();
  });

  it('keeps the data local and says so when the user declines', async () => {
    // Arrange
    window.localStorage.setItem(LOCAL_VAULT_DATA_KEY, JSON.stringify(LOCAL_DATA));
    answerRequests(new Response(null, { status: 500 }));
    const user = userEvent.setup();
    render(<AuthEntry />);
    await signUp(user);

    // Act
    await user.click(await screen.findByRole('button', { name: 'Keep on this device only' }));

    // Assert
    expect(screen.getByRole('status')).toHaveTextContent(
      "Your local vaults stay on this device and aren't linked to your account."
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem(MIGRATION_RECORD_KEY)).toBeNull();
  });

  it('migrates the vaults when the user confirms and finishes without the toast', async () => {
    // Arrange
    window.localStorage.setItem(LOCAL_VAULT_DATA_KEY, JSON.stringify(LOCAL_DATA));
    answerRequests(new Response(JSON.stringify({ vaults: 1 }), { status: 201 }));
    const user = userEvent.setup();
    render(<AuthEntry />);
    await signUp(user);

    // Act
    await user.click(await screen.findByRole('button', { name: 'Migrate my vaults' }));
    await user.click(await screen.findByRole('button', { name: 'Open my vaults' }));

    // Assert
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(window.localStorage.getItem(MIGRATION_RECORD_KEY)).toContain('v1');
    expect(screen.getByRole('img', { name: 'Signed in as jd@example.com' })).toBeInTheDocument();
  });

  it('does not offer vaults that were already migrated', async () => {
    // Arrange
    window.localStorage.setItem(LOCAL_VAULT_DATA_KEY, JSON.stringify(LOCAL_DATA));
    window.localStorage.setItem(
      MIGRATION_RECORD_KEY,
      JSON.stringify({ userId: 'old', migratedAt: '2026-01-01T00:00:00Z', vaultIds: ['v1'] })
    );
    answerRequests(new Response(null, { status: 500 }));
    const user = userEvent.setup();
    render(<AuthEntry />);

    // Act
    await signUp(user);

    // Assert
    expect(await screen.findByRole('status')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
