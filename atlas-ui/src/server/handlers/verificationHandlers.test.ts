import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getSessionCookieName } from '@/server/auth/authCookies';
import {
  UpstreamMock,
  createRequest,
  createTrustedRequest,
  makeJwt,
  silenceServerLog
} from '@/test/serverHelpers';
import {
  handleResendVerification,
  handleVerificationStatus,
  handleVerifyEmail
} from './verificationHandlers';

const upstream = new UpstreamMock();
const TOKEN = makeJwt();
const SESSION = { [getSessionCookieName()]: TOKEN };
const BODY = JSON.stringify({ token: 'abc' });

beforeEach(() => {
  upstream.install();
});

afterEach(() => {
  upstream.uninstall();
  vi.restoreAllMocks();
});

describe('handleVerifyEmail', () => {
  it('passes the token to the API without a session and without any browser cookies', async () => {
    // Arrange
    upstream.reply(204, '');
    const request = createTrustedRequest('/api/v1/auth/verify-email', {
      body: BODY,
      headers: { 'x-correlation-id': 'corr-1' }
    });

    // Act
    const response = await handleVerifyEmail(request);

    // Assert
    expect(response.status).toBe(204);
    expect(upstream.calls[0].url).toBe('http://localhost:8080/api/v1/auth/verify-email');
    expect(upstream.calls[0].data).toBe(BODY);
    expect(upstream.lastHeaders()).toMatchObject({ 'x-correlation-id': 'corr-1' });
    expect(upstream.lastHeaders()).not.toHaveProperty('cookie');
    expect(upstream.lastHeaders()).not.toHaveProperty('authorization');
  });

  it('passes the API refusal through unchanged', async () => {
    // Arrange
    const problem = {
      statusCode: 400,
      title: 'Bad Request',
      detail: 'The verification link is invalid or has expired.'
    };
    upstream.reply(400, problem);
    const request = createTrustedRequest('/api/v1/auth/verify-email', { body: BODY });

    // Act
    const response = await handleVerifyEmail(request);

    // Assert
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual(problem);
  });

  it('refuses a request without a valid CSRF token and never calls the API', async () => {
    // Arrange
    const request = createRequest('/api/v1/auth/verify-email', { method: 'POST', body: BODY });

    // Act
    const response = await handleVerifyEmail(request);

    // Assert
    expect(response.status).toBe(403);
    expect(upstream.calls).toHaveLength(0);
  });

  it('refuses a body that is too large', async () => {
    // Arrange
    const request = createTrustedRequest('/api/v1/auth/verify-email', {
      body: 'x'.repeat(64 * 1024 + 1)
    });

    // Act
    const response = await handleVerifyEmail(request);

    // Assert
    expect(response.status).toBe(413);
    expect(upstream.calls).toHaveLength(0);
  });

  it('answers 502 when the API cannot be reached', async () => {
    // Arrange
    silenceServerLog();
    upstream.fail();
    const request = createTrustedRequest('/api/v1/auth/verify-email', { body: BODY });

    // Act
    const response = await handleVerifyEmail(request);

    // Assert
    expect(response.status).toBe(502);
  });
});

describe('handleResendVerification', () => {
  it('asks the API for a new email on behalf of the signed-in user, using the Bearer token', async () => {
    // Arrange
    upstream.reply(204, '');
    const request = createTrustedRequest('/api/v1/auth/resend-verification', {
      cookies: SESSION
    });

    // Act
    const response = await handleResendVerification(request);

    // Assert
    expect(response.status).toBe(204);
    expect(upstream.calls[0].url).toBe('http://localhost:8080/api/v1/auth/resend-verification');
    expect(upstream.lastHeaders()).toMatchObject({ authorization: `Bearer ${TOKEN}` });
  });

  it('refuses a request without a session and never calls the API', async () => {
    // Arrange
    const request = createTrustedRequest('/api/v1/auth/resend-verification');

    // Act
    const response = await handleResendVerification(request);

    // Assert
    expect(response.status).toBe(401);
    expect(upstream.calls).toHaveLength(0);
  });
});

describe('handleVerificationStatus', () => {
  it('asks the API whether the signed-in user is verified and passes the answer back', async () => {
    // Arrange
    upstream.reply(200, { isVerified: true });
    const request = createRequest('/api/v1/auth/verification-status', { cookies: SESSION });

    // Act
    const response = await handleVerificationStatus(request);

    // Assert
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ isVerified: true });
    expect(upstream.calls[0].url).toBe('http://localhost:8080/api/v1/auth/verification-status');
    expect(upstream.lastHeaders()).toMatchObject({ authorization: `Bearer ${TOKEN}` });
  });

  it('refuses a request without a session and never calls the API', async () => {
    // Arrange
    const request = createRequest('/api/v1/auth/verification-status');

    // Act
    const response = await handleVerificationStatus(request);

    // Assert
    expect(response.status).toBe(401);
    expect(upstream.calls).toHaveLength(0);
  });
});
