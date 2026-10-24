import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpMock, jsonReply, problemReply } from '@/test/HttpMock';
import { setErrorLogSink } from '@/lib/logging/logger';
import { VerifyEmailPage } from './VerifyEmailPage';

const http = new HttpMock();

function openLink(hash: string): void {
  window.history.replaceState(null, '', `/verify-email${hash}`);
}

beforeEach(() => {
  http.install();
});

afterEach(() => {
  http.uninstall();
  setErrorLogSink(null);
  window.history.replaceState(null, '', '/');
});

describe('VerifyEmailPage', () => {
  it('sends the token from the link, removes it from the address bar and confirms', async () => {
    // Arrange
    http.handler.mockResolvedValue(jsonReply(204));
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
});
