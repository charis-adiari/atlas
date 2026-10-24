import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setEmailVerificationProvider } from '@/lib/auth/verification/emailVerification';
import { setErrorLogSink, type ErrorLogEntry } from '@/lib/logging/logger';
import { CheckInboxDialog } from './CheckInboxDialog';

const EMAIL = 'jd@example.com';

function installProvider(overrides = {}) {
  const provider = {
    isRequired: true,
    sendVerification: vi.fn().mockResolvedValue(undefined),
    checkVerified: vi.fn().mockResolvedValue(false),
    ...overrides
  };
  setEmailVerificationProvider(provider);
  return provider;
}

function renderDialog(hasLocalVaults = false) {
  const onVerified = vi.fn();
  const onUseDifferentEmail = vi.fn();
  render(
    <CheckInboxDialog
      email={EMAIL}
      hasLocalVaults={hasLocalVaults}
      onVerified={onVerified}
      onUseDifferentEmail={onUseDifferentEmail}
    />
  );
  return {
    onVerified,
    onUseDifferentEmail,
    user: userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  };
}

async function advance(milliseconds: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(milliseconds);
  });
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  setEmailVerificationProvider(null);
  setErrorLogSink(null);
  vi.useRealTimers();
});

describe('CheckInboxDialog', () => {
  it('says where the verification link was sent', () => {
    // Arrange
    installProvider();
    renderDialog();

    // Act
    const dialog = screen.getByRole('dialog', { name: 'Check your inbox' });

    // Assert
    expect(dialog).toHaveTextContent(`We sent a verification link to ${EMAIL}`);
  });

  it('keeps the resend button disabled with a countdown, then enables it after thirty seconds', async () => {
    // Arrange
    installProvider();
    renderDialog();
    const wasDisabledAtStart = screen
      .getByRole('button', { name: 'Resend email in 0:30' })
      .hasAttribute('disabled');

    // Act
    await advance(10_000);
    const wasDisabledAfterTenSeconds = screen
      .getByRole('button', { name: 'Resend email in 0:20' })
      .hasAttribute('disabled');
    await advance(20_000);

    // Assert
    expect(wasDisabledAtStart).toBe(true);
    expect(wasDisabledAfterTenSeconds).toBe(true);
    expect(screen.getByRole('button', { name: 'Resend email' })).toBeEnabled();
  });

  it('sends another email and restarts the countdown when the user asks for one', async () => {
    // Arrange
    const provider = installProvider();
    const { user } = renderDialog();
    await advance(30_000);

    // Act
    await user.click(screen.getByRole('button', { name: 'Resend email' }));

    // Assert
    expect(provider.sendVerification).toHaveBeenCalledWith(EMAIL);
    expect(screen.getByRole('button', { name: 'Resend email in 0:30' })).toBeDisabled();
  });

  it('logs, and does not break, when sending another email fails', async () => {
    // Arrange
    const sink = vi.fn<(entry: ErrorLogEntry) => void>();
    setErrorLogSink(sink);
    installProvider({ sendVerification: vi.fn().mockRejectedValue(new Error('smtp down')) });
    const { user } = renderDialog();
    await advance(30_000);

    // Act
    await user.click(screen.getByRole('button', { name: 'Resend email' }));

    // Assert
    expect(sink.mock.calls[0][0]).toMatchObject({ context: 'verification', message: 'smtp down' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('checks every few seconds and reports when the address has been verified', async () => {
    // Arrange
    const provider = installProvider();
    const { onVerified } = renderDialog();
    await advance(3000);
    const calledWhileUnverified = onVerified.mock.calls.length;
    provider.checkVerified.mockResolvedValue(true);

    // Act
    await advance(3000);

    // Assert
    expect(provider.checkVerified).toHaveBeenCalledTimes(2);
    expect(calledWhileUnverified).toBe(0);
    expect(onVerified).toHaveBeenCalledTimes(1);
  });

  it('logs a failed check and keeps waiting', async () => {
    // Arrange
    const sink = vi.fn<(entry: ErrorLogEntry) => void>();
    setErrorLogSink(sink);
    const provider = installProvider({
      checkVerified: vi.fn().mockRejectedValue(new Error('boom'))
    });
    const { onVerified } = renderDialog();

    // Act
    await advance(3000);
    provider.checkVerified.mockResolvedValue(true);
    await advance(3000);

    // Assert
    expect(sink).toHaveBeenCalledTimes(1);
    expect(onVerified).toHaveBeenCalledTimes(1);
  });

  it('stops checking once it is closed', async () => {
    // Arrange
    const provider = installProvider();
    const { unmount } = (() => {
      const result = render(
        <CheckInboxDialog
          email={EMAIL}
          hasLocalVaults={false}
          onVerified={vi.fn()}
          onUseDifferentEmail={vi.fn()}
        />
      );
      return result;
    })();
    unmount();

    // Act
    await advance(10_000);

    // Assert
    expect(provider.checkVerified).not.toHaveBeenCalled();
  });

  it('lets the user go back and use a different email', async () => {
    // Arrange
    installProvider();
    const { user, onUseDifferentEmail } = renderDialog();

    // Act
    await user.click(screen.getByRole('button', { name: 'Use a different email' }));

    // Assert
    expect(onUseDifferentEmail).toHaveBeenCalledTimes(1);
  });

  it('reassures the user about local vaults only when there are some', () => {
    // Arrange
    installProvider();
    renderDialog(true);

    // Act
    const dialog = screen.getByRole('dialog');

    // Assert
    expect(dialog).toHaveTextContent("Your local vaults haven't been touched.");
  });

  it('says nothing about local vaults when there are none', () => {
    // Arrange
    installProvider();
    renderDialog(false);

    // Act
    const dialog = screen.getByRole('dialog');

    // Assert
    expect(dialog).not.toHaveTextContent('local vaults');
  });

  it('cannot be dismissed with Escape, so the flow does not carry on unverified', () => {
    // Arrange
    installProvider();
    renderDialog();
    const escape = new Event('cancel', { cancelable: true });

    // Act
    screen.getByRole('dialog').dispatchEvent(escape);
    fireEvent.click(screen.getByRole('dialog'));

    // Assert
    expect(escape.defaultPrevented).toBe(true);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
