import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthStatus, getAuthState, resetAuthState } from '@/lib/auth/session/authSessionStore';
import { HttpMock, jsonReply, problemReply } from '@/test/HttpMock';
import {
  API_EMAIL_VERIFICATION,
  getEmailVerificationProvider,
  setEmailVerificationProvider
} from './emailVerification';

const http = new HttpMock();

beforeEach(() => {
  http.install();
  resetAuthState();
});

afterEach(() => {
  http.uninstall();
  resetAuthState();
  setEmailVerificationProvider(null);
});

describe('setEmailVerificationProvider', () => {
  it('lets another provider replace the current one', () => {
    // Arrange
    const real = { sendVerification: vi.fn(), checkVerified: vi.fn() };

    // Act
    setEmailVerificationProvider(real);

    // Assert
    expect(getEmailVerificationProvider()).toBe(real);
  });

  it('restores the provider backed by the API when given null', () => {
    // Arrange
    setEmailVerificationProvider({ sendVerification: vi.fn(), checkVerified: vi.fn() });

    // Act
    setEmailVerificationProvider(null);

    // Assert
    expect(getEmailVerificationProvider()).toBe(API_EMAIL_VERIFICATION);
  });
});

describe('the provider backed by the API', () => {
  it('sends a new link to the given address', async () => {
    // Arrange
    http.handler.mockResolvedValue(jsonReply(202));

    // Act
    await API_EMAIL_VERIFICATION.sendVerification('jd@example.com');

    // Assert
    const request = http.handler.mock.calls[0][0];
    expect(request.path).toBe('/auth/resend-verification');
    expect(request.body).toEqual({ email: 'jd@example.com' });
  });

  it('reports the link as opened and signs the user in once this browser has a session', async () => {
    // Arrange
    const user = { id: 'user-1', email: 'jd@example.com' };
    http.handler.mockResolvedValue(jsonReply(200, { user, expiresAt: Date.now() + 60_000 }));

    // Act
    const isVerified = await API_EMAIL_VERIFICATION.checkVerified();

    // Assert
    expect(isVerified).toBe(true);
    expect(http.handler.mock.calls[0][0].path).toBe('/auth/session');
    expect(getAuthState().status).toBe(AuthStatus.authenticated);
    expect(getAuthState().session?.user).toEqual(user);
  });

  it('reports the link as not opened while there is no session', async () => {
    // Arrange
    http.handler.mockResolvedValue(problemReply(401, 'There is no active session.'));

    // Act
    const isVerified = await API_EMAIL_VERIFICATION.checkVerified();

    // Assert
    expect(isVerified).toBe(false);
    expect(getAuthState().status).toBe(AuthStatus.loading);
  });
});
