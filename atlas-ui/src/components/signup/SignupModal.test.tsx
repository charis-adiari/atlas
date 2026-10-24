import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getAuthState, resetAuthState } from '@/lib/auth/session/authSessionStore';
import {
  ACCOUNT_NOT_CREATED_MESSAGE,
  UNEXPECTED_SIGNUP_ERROR_MESSAGE
} from '@/lib/auth/signupErrors';
import { setErrorLogSink, type ErrorLogEntry } from '@/lib/logging/logger';
import { HttpMock, jsonReply, problemReply } from '@/test/HttpMock';
import type { SignupResponse } from '@/types/auth';
import { SignupModal } from './SignupModal';

const VALID_EMAIL = 'you@example.com';
const VALID_PASSWORD = 'Valid-Passw0rd';
const LOCAL_DATA_KEY = 'atlas.vaults';
const LOCAL_DATA_VALUE = '[{"name":"Personal"}]';

const SIGNUP_RESPONSE: SignupResponse = {
  user: { id: 'user-1', email: VALID_EMAIL },
  expiresIn: 3600
};

const http = new HttpMock();

function renderModal(props: { onLoginClick?: () => void } = {}) {
  const onClose = vi.fn();
  const onSuccess = vi.fn();
  render(<SignupModal onClose={onClose} onSuccess={onSuccess} {...props} />);
  return { onClose, onSuccess, user: userEvent.setup() };
}

function getSubmitButton(): HTMLElement {
  return screen.getByRole('button', { name: /create account|creating account/i });
}

async function fillForm(
  user: ReturnType<typeof userEvent.setup>,
  password = VALID_PASSWORD,
  confirmation = password
) {
  await user.type(screen.getByLabelText('Email'), VALID_EMAIL);
  await user.type(screen.getByLabelText('Password'), password);
  await user.type(screen.getByLabelText('Confirm password'), confirmation);
}

beforeEach(() => {
  http.install();
  window.localStorage.setItem(LOCAL_DATA_KEY, LOCAL_DATA_VALUE);
});

afterEach(() => {
  http.uninstall();
  resetAuthState();
  setErrorLogSink(null);
  window.localStorage.clear();
});

describe('SignupModal', () => {
  it('opens as a modal dialog titled "Create your account"', () => {
    // Arrange
    renderModal();

    // Act
    const dialog = screen.getByRole('dialog', { name: 'Create your account' });

    // Assert
    expect(dialog).toBeInTheDocument();
  });

  it('starts with every requirement unmet and the submit button disabled', () => {
    // Arrange
    renderModal();

    // Act
    const unmet = screen.getAllByText(/\(not met\)/);

    // Assert
    expect(unmet).toHaveLength(5);
    expect(getSubmitButton()).toBeDisabled();
  });

  it('ticks off each requirement as the password is typed', async () => {
    // Arrange
    const { user } = renderModal();

    // Act
    await user.type(screen.getByLabelText('Password'), 'abcdefg1');

    // Assert
    expect(screen.getByText('At least 8 characters').textContent).toContain('(met)');
    expect(screen.getByText('One lowercase letter').textContent).toContain('(met)');
    expect(screen.getByText('One digit').textContent).toContain('(met)');
    expect(screen.getByText('One uppercase letter').textContent).toContain('(not met)');
    expect(screen.getByText('One special character').textContent).toContain('(not met)');
  });

  it('keeps the submit button disabled for a weak password', async () => {
    // Arrange
    const { user } = renderModal();

    // Act
    await fillForm(user, 'weakpass1');

    // Assert
    expect(getSubmitButton()).toBeDisabled();
  });

  it('enables the submit button once email and password are valid', async () => {
    // Arrange
    const { user } = renderModal();

    // Act
    await fillForm(user);

    // Assert
    expect(getSubmitButton()).toBeEnabled();
  });

  it('warns and stays disabled when the password is longer than 72 characters', async () => {
    // Arrange
    const { user } = renderModal();

    // Act
    await fillForm(user, `Aa1!${'a'.repeat(70)}`);

    // Assert
    expect(screen.getByText('Password must be at most 72 characters')).toBeInTheDocument();
    expect(getSubmitButton()).toBeDisabled();
  });

  it('reveals and hides the password with the eye button', async () => {
    // Arrange
    const { user } = renderModal();
    const input = screen.getByLabelText('Password');

    // Act
    await user.click(screen.getByRole('button', { name: 'Show password' }));
    const typeWhenShown = input.getAttribute('type');
    await user.click(screen.getByRole('button', { name: 'Hide password' }));

    // Assert
    expect(typeWhenShown).toBe('text');
    expect(input).toHaveAttribute('type', 'password');
  });

  it('flags a malformed email once the field loses focus', async () => {
    // Arrange
    const { user } = renderModal();

    // Act
    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.tab();

    // Assert
    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument();
  });
});

describe('SignupModal submitting', () => {
  it('sends the trimmed, lower-cased email and the password', async () => {
    // Arrange
    http.handler.mockResolvedValue(jsonReply(201, SIGNUP_RESPONSE));
    const { user } = renderModal();
    await user.type(screen.getByLabelText('Email'), '  You@Example.COM ');
    await user.type(screen.getByLabelText('Password'), VALID_PASSWORD);
    await user.type(screen.getByLabelText('Confirm password'), VALID_PASSWORD);

    // Act
    await user.click(getSubmitButton());

    // Assert
    await waitFor(() => expect(http.handler).toHaveBeenCalledTimes(1));
    const request = http.handler.mock.calls[0][0];
    expect(request.path).toBe('/auth/signup');
    expect(request.body).toEqual({ email: VALID_EMAIL, password: VALID_PASSWORD });
  });

  it('starts the session, keeps no token in the page, and reports success', async () => {
    // Arrange
    http.handler.mockResolvedValue(jsonReply(201, SIGNUP_RESPONSE));
    const { user, onSuccess } = renderModal();
    await fillForm(user);

    // Act
    await user.click(getSubmitButton());

    // Assert
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(SIGNUP_RESPONSE));
    expect(getAuthState().status).toBe('authenticated');
    expect(getAuthState().session?.user.email).toBe(VALID_EMAIL);
    expect(JSON.stringify({ ...window.localStorage })).not.toMatch(/token|jwt|session/i);
  });

  it('disables the button and shows progress while the request is in flight', async () => {
    // Arrange
    http.handler.mockReturnValue(new Promise(() => undefined));
    const { user } = renderModal();
    await fillForm(user);

    // Act
    await user.click(getSubmitButton());

    // Assert
    expect(screen.getByRole('button', { name: 'Creating account…' })).toBeDisabled();
  });

  it('shows a message that does not reveal why, and keeps the user anonymous, when the email is taken', async () => {
    // Arrange
    http.handler.mockResolvedValue(
      problemReply(400, 'The account could not be created with the details provided.')
    );
    const { user, onSuccess } = renderModal();
    await fillForm(user);

    // Act
    await user.click(getSubmitButton());

    // Assert
    expect(await screen.findByRole('alert')).toHaveTextContent(ACCOUNT_NOT_CREATED_MESSAGE);
    expect(onSuccess).not.toHaveBeenCalled();
    expect(getAuthState().session).toBeNull();
    expect(JSON.stringify({ ...window.localStorage })).not.toMatch(/token|jwt|session/i);
  });

  it('leaves local data and the typed values untouched after a failed signup', async () => {
    // Arrange
    setErrorLogSink(vi.fn());
    http.handler.mockResolvedValue(problemReply(500, 'An unexpected error occurred.'));
    const { user } = renderModal();
    await fillForm(user);

    // Act
    await user.click(getSubmitButton());
    await screen.findByRole('alert');

    // Assert
    expect(window.localStorage.getItem(LOCAL_DATA_KEY)).toBe(LOCAL_DATA_VALUE);
    expect(screen.getByLabelText('Email')).toHaveValue(VALID_EMAIL);
    expect(screen.getByLabelText('Password')).toHaveValue(VALID_PASSWORD);
    expect(getSubmitButton()).toBeEnabled();
  });

  it('shows a connection message and stays anonymous when the server is unreachable', async () => {
    // Arrange
    http.handler.mockRejectedValue(new TypeError('Failed to fetch'));
    const { user } = renderModal();
    await fillForm(user);

    // Act
    await user.click(getSubmitButton());

    // Assert
    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't reach the server/i);
    expect(getAuthState().session).toBeNull();
  });

  it('shows a generic message and logs the details when the success response cannot be read', async () => {
    // Arrange
    const sink = vi.fn<(entry: ErrorLogEntry) => void>();
    setErrorLogSink(sink);
    http.handler.mockResolvedValue(jsonReply(200, '<html></html>'));
    const { user } = renderModal();
    await fillForm(user);

    // Act
    await user.click(getSubmitButton());

    // Assert
    expect(await screen.findByRole('alert')).toHaveTextContent(UNEXPECTED_SIGNUP_ERROR_MESSAGE);
    expect(getAuthState().session).toBeNull();
    expect(sink).toHaveBeenCalledTimes(1);
  });

  it('shows a generic message, not the server wording, and logs the technical details for a server error', async () => {
    // Arrange
    const sink = vi.fn<(entry: ErrorLogEntry) => void>();
    setErrorLogSink(sink);
    http.handler.mockResolvedValue(problemReply(500, 'NullPointerException at AuthService:42'));
    const { user } = renderModal();
    await fillForm(user);

    // Act
    await user.click(getSubmitButton());

    // Assert
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(UNEXPECTED_SIGNUP_ERROR_MESSAGE);
    expect(alert).not.toHaveTextContent('NullPointerException');
    expect(sink).toHaveBeenCalledTimes(1);
    expect(sink.mock.calls[0][0]).toMatchObject({
      context: 'signup',
      statusCode: 500,
      message: 'NullPointerException at AuthService:42',
      path: '/auth/signup'
    });
    expect(JSON.stringify(sink.mock.calls[0][0])).not.toContain(VALID_PASSWORD);
  });

  it('does not log an expected failure such as a refused account', async () => {
    // Arrange
    const sink = vi.fn<(entry: ErrorLogEntry) => void>();
    setErrorLogSink(sink);
    http.handler.mockResolvedValue(
      problemReply(400, 'The account could not be created with the details provided.')
    );
    const { user } = renderModal();
    await fillForm(user);

    // Act
    await user.click(getSubmitButton());
    await screen.findByRole('alert');

    // Assert
    expect(sink).not.toHaveBeenCalled();
  });

  it('shows a friendly message of its own for a refused account, whatever wording the server used', async () => {
    // Arrange
    http.handler.mockResolvedValue(
      problemReply(400, 'duplicate key value violates constraint uq_users_email')
    );
    const { user } = renderModal();
    await fillForm(user);

    // Act
    await user.click(getSubmitButton());

    // Assert
    expect(await screen.findByRole('alert')).toHaveTextContent(ACCOUNT_NOT_CREATED_MESSAGE);
  });

  it('shows per-field errors from the API next to their inputs', async () => {
    // Arrange
    http.handler.mockResolvedValue(
      problemReply(400, 'The request is invalid.', {
        email: 'Enter a valid email address',
        password: 'Password is required'
      })
    );
    const { user } = renderModal();
    await fillForm(user);

    // Act
    await user.click(getSubmitButton());

    // Assert
    expect(await screen.findByText('Password is required')).toBeInTheDocument();
    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
  });

  it('clears a field error from the API when that field is edited', async () => {
    // Arrange
    http.handler.mockResolvedValue(
      problemReply(400, 'The request is invalid.', { email: 'Enter a valid email address' })
    );
    const { user } = renderModal();
    await fillForm(user);
    await user.click(getSubmitButton());
    await screen.findByText('Enter a valid email address');

    // Act
    await user.type(screen.getByLabelText('Email'), 'm');

    // Assert
    expect(screen.queryByText('Enter a valid email address')).not.toBeInTheDocument();
  });

  it('does not send a request when the form is submitted with a weak password', async () => {
    // Arrange
    const { user } = renderModal();
    await fillForm(user, 'weak');

    // Act
    await user.type(screen.getByLabelText('Password'), '{Enter}');

    // Assert
    expect(http.handler).not.toHaveBeenCalled();
  });
});

describe('SignupModal password confirmation', () => {
  it('starts with an empty confirmation field and no message about it', () => {
    // Arrange
    renderModal();

    // Act
    const field = screen.getByLabelText('Confirm password');

    // Assert
    expect(field).toHaveValue('');
    expect(screen.queryByText("Passwords don't match")).not.toBeInTheDocument();
  });

  it('keeps the submit button disabled until the confirmation is typed', async () => {
    // Arrange
    const { user } = renderModal();
    await user.type(screen.getByLabelText('Email'), VALID_EMAIL);

    // Act
    await user.type(screen.getByLabelText('Password'), VALID_PASSWORD);

    // Assert
    expect(getSubmitButton()).toBeDisabled();
  });

  it('enables the submit button once the confirmation matches a strong password', async () => {
    // Arrange
    const { user } = renderModal();

    // Act
    await fillForm(user);

    // Assert
    expect(getSubmitButton()).toBeEnabled();
    expect(screen.queryByText("Passwords don't match")).not.toBeInTheDocument();
  });

  it('does not nag while the confirmation is still shorter than the password', async () => {
    // Arrange
    const { user } = renderModal();
    await user.type(screen.getByLabelText('Password'), VALID_PASSWORD);

    // Act
    await user.type(screen.getByLabelText('Confirm password'), 'Valid');

    // Assert
    expect(screen.queryByText("Passwords don't match")).not.toBeInTheDocument();
    expect(getSubmitButton()).toBeDisabled();
  });

  it('reports a mismatch once the confirmation is as long as the password', async () => {
    // Arrange
    const { user } = renderModal();
    await user.type(screen.getByLabelText('Password'), VALID_PASSWORD);

    // Act
    await user.type(screen.getByLabelText('Confirm password'), 'Valid-Passw0rX');

    // Assert
    expect(screen.getByText("Passwords don't match")).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm password')).toHaveAttribute('aria-invalid', 'true');
  });

  it('reports a shorter confirmation as a mismatch after the field loses focus', async () => {
    // Arrange
    const { user } = renderModal();
    await user.type(screen.getByLabelText('Password'), VALID_PASSWORD);
    await user.type(screen.getByLabelText('Confirm password'), 'Valid');

    // Act
    await user.tab();

    // Assert
    expect(screen.getByText("Passwords don't match")).toBeInTheDocument();
  });

  it('keeps the submit button disabled while the two passwords differ', async () => {
    // Arrange
    const { user } = renderModal();

    // Act
    await fillForm(user, VALID_PASSWORD, 'Valid-Passw0rX');

    // Assert
    expect(getSubmitButton()).toBeDisabled();
  });

  it('clears the message once the confirmation is corrected', async () => {
    // Arrange
    const { user } = renderModal();
    await fillForm(user, VALID_PASSWORD, 'Valid-Passw0rX');

    // Act
    const confirmation = screen.getByLabelText('Confirm password');
    await user.clear(confirmation);
    await user.type(confirmation, VALID_PASSWORD);

    // Assert
    expect(screen.queryByText("Passwords don't match")).not.toBeInTheDocument();
    expect(getSubmitButton()).toBeEnabled();
  });

  it('notices a mismatch that appears when the password is changed afterwards', async () => {
    // Arrange
    const { user } = renderModal();
    await fillForm(user);

    // Act
    await user.type(screen.getByLabelText('Password'), '9');

    // Assert
    expect(screen.getByText("Passwords don't match")).toBeInTheDocument();
    expect(getSubmitButton()).toBeDisabled();
  });

  it('does not send a request when submitted with mismatching passwords', async () => {
    // Arrange
    const { user } = renderModal();
    await fillForm(user, VALID_PASSWORD, 'Valid-Passw0rX');

    // Act
    await user.type(screen.getByLabelText('Confirm password'), '{Enter}');

    // Assert
    expect(http.handler).not.toHaveBeenCalled();
    expect(getAuthState().session).toBeNull();
  });

  it('never sends the confirmation to the API', async () => {
    // Arrange
    http.handler.mockResolvedValue(jsonReply(201, SIGNUP_RESPONSE));
    const { user } = renderModal();
    await fillForm(user);

    // Act
    await user.click(getSubmitButton());

    // Assert
    await waitFor(() => expect(http.handler).toHaveBeenCalledTimes(1));
    const body = http.handler.mock.calls[0][0].body as Record<string, unknown>;
    expect(Object.keys(body).sort()).toEqual(['email', 'password']);
  });

  it('reveals the confirmation with its own eye button, leaving the password hidden', async () => {
    // Arrange
    const { user } = renderModal();

    // Act
    await user.click(screen.getByRole('button', { name: 'Show confirm password' }));

    // Assert
    expect(screen.getByLabelText('Confirm password')).toHaveAttribute('type', 'text');
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Hide confirm password' })).toBeInTheDocument();
  });
});

describe('SignupModal dismissing', () => {
  it('closes from the close button', async () => {
    // Arrange
    const { user, onClose } = renderModal();

    // Act
    await user.click(screen.getByRole('button', { name: 'Close' }));

    // Assert
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when the backdrop is clicked but not when the card is clicked', () => {
    // Arrange
    const { onClose } = renderModal();
    const dialog = screen.getByRole('dialog');

    // Act
    fireEvent.click(screen.getByRole('heading', { name: 'Create your account' }));
    const callsAfterCardClick = onClose.mock.calls.length;
    fireEvent.click(dialog);

    // Assert
    expect(callsAfterCardClick).toBe(0);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when the browser closes the dialog, as it does on Escape', () => {
    // Arrange
    const { onClose } = renderModal();

    // Act
    fireEvent(screen.getByRole('dialog'), new Event('close'));

    // Assert
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('offers the log in link only when a handler is provided', async () => {
    // Arrange
    const onLoginClick = vi.fn();
    const { user } = renderModal({ onLoginClick });

    // Act
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    // Assert
    expect(onLoginClick).toHaveBeenCalledTimes(1);
  });

  it('hides the log in link when there is no handler', () => {
    // Arrange
    renderModal();

    // Act
    const link = screen.queryByRole('button', { name: 'Log in' });

    // Assert
    expect(link).not.toBeInTheDocument();
  });
});
