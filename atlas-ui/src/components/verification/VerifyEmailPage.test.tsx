import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpMock, jsonReply, problemReply } from '@/test/HttpMock';
import { getAuthState, resetAuthState } from '@/lib/auth/session/authSessionStore';
import { TOO_MANY_ATTEMPTS_MESSAGE } from '@/lib/auth/signupErrors';
import { setEmailVerificationProvider } from '@/lib/auth/verification/emailVerification';
import { setErrorLogSink } from '@/lib/logging/logger';
import { RESEND_SENT_MESSAGE } from './ResendVerificationForm';
import { VerifyEmailPage } from './VerifyEmailPage';

const http = new HttpMock();
const USER = { id: 'user-1', email: 'jd@example.com' };

function openLink(hash: string): void {
  window.history.replaceState(null, '', `/verify-email${hash}`);
}

/**
 * Opens a link the API refuses, so the page offers to send a new one.
 */
async function openFailedLink(): Promise<void> {
  http.handler.mockResolvedValueOnce(problemReply(400, 'The verification link is invalid.'));
  openLink('#token=expired');
  render(<VerifyEmailPage />);
  await screen.findByRole('heading', { name: "We couldn't verify your email address" });
}

beforeEach(() => {
  http.install();
  setEmailVerificationProvider(null);
});

afterEach(() => {
  http.uninstall();
  resetAuthState();
  setErrorLogSink(null);
  window.history.replaceState(null, '', '/');
});

describe('VerifyEmailPage', () => {
  it('sends the token from the link, removes it from the address bar, signs the user in and confirms', async () => {
    // Arrange
    http.handler.mockResolvedValue(jsonReply(200, { user: USER, expiresIn: 3600 }));
    openLink('#token=abc123');

    // Act
    render(<VerifyEmailPage />);

    // Assert
    expect(
      await screen.findByRole('heading', { name: 'Your email address is verified' })
    ).toBeInTheDocument();
    expect(http.handler.mock.calls.at(-1)?.[0].body).toEqual({ token: 'abc123' });
    expect(window.location.hash).toBe('');
    expect(screen.getByRole('link', { name: 'Go to Atlas' })).toHaveAttribute('href', '/');
    expect(getAuthState().session?.user).toEqual(USER);
    expect(screen.queryByRole('button', { name: 'Send a new link' })).not.toBeInTheDocument();
  });

  it('says the link is no good when the API refuses the token, without logging it', async () => {
    // Arrange
    const sink = vi.fn();
    setErrorLogSink(sink);
    http.handler.mockResolvedValue(problemReply(400, 'The verification link is invalid.'));
    openLink('#token=used-already');

    // Act
    render(<VerifyEmailPage />);

    // Assert
    expect(
      await screen.findByRole('heading', { name: "We couldn't verify your email address" })
    ).toBeInTheDocument();
    expect(sink).not.toHaveBeenCalled();
  });

  it('fails without calling the API when the link has no token', async () => {
    // Arrange
    openLink('');

    // Act
    render(<VerifyEmailPage />);

    // Assert
    expect(
      await screen.findByRole('heading', { name: "We couldn't verify your email address" })
    ).toBeInTheDocument();
    expect(http.handler).not.toHaveBeenCalled();
  });

  it('logs a failure that is not a refusal and still tells the user it failed', async () => {
    // Arrange
    const sink = vi.fn();
    setErrorLogSink(sink);
    http.handler.mockResolvedValue(problemReply(503, 'An unexpected error occurred.'));
    openLink('#token=abc');

    // Act
    render(<VerifyEmailPage />);

    // Assert
    await screen.findByRole('heading', { name: "We couldn't verify your email address" });
    expect(sink).toHaveBeenCalledTimes(1);
  });

  it('lets the user ask for a new link by typing their address when the link did not work', async () => {
    // Arrange
    await openFailedLink();
    http.handler.mockResolvedValueOnce(jsonReply(202));
    const user = userEvent.setup();

    // Act
    await user.type(screen.getByLabelText('Email'), ' JD@Example.com ');
    await user.click(screen.getByRole('button', { name: 'Send a new link' }));

    // Assert
    expect(await screen.findByText(RESEND_SENT_MESSAGE)).toBeInTheDocument();
    const request = http.handler.mock.calls.at(-1)?.[0];
    expect(request?.path).toBe('/auth/resend-verification');
    expect(request?.body).toEqual({ email: 'jd@example.com' });
    expect(getAuthState().session).toBeNull();
  });

  it('does not send anything while the address is not valid', async () => {
    // Arrange
    await openFailedLink();
    const user = userEvent.setup();
    const callsBefore = http.handler.mock.calls.length;

    // Act
    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.click(screen.getByRole('button', { name: 'Send a new link' }));

    // Assert
    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(http.handler.mock.calls.length).toBe(callsBefore);
  });

  it('asks the user to wait, without logging it, after too many requests', async () => {
    // Arrange
    const sink = vi.fn();
    setErrorLogSink(sink);
    await openFailedLink();
    http.handler.mockResolvedValueOnce(problemReply(429, 'Too many requests.'));
    const user = userEvent.setup();

    // Act
    await user.type(screen.getByLabelText('Email'), 'jd@example.com');
    await user.click(screen.getByRole('button', { name: 'Send a new link' }));

    // Assert
    expect(await screen.findByRole('alert')).toHaveTextContent(TOO_MANY_ATTEMPTS_MESSAGE);
    await waitFor(() => expect(sink).not.toHaveBeenCalled());
  });
});
