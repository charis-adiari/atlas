import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getCsrfCookieName, getSessionCookieName } from '@/server/auth/authCookies';
import {
  UpstreamMock,
  createRequest,
  createTrustedRequest,
  makeJwt,
  silenceServerLog
} from '@/test/serverHelpers';
import { handleResendVerification, handleVerifyEmail } from './verificationHandlers';

const upstream = new UpstreamMock();
const TOKEN_RESPONSE = { accessToken: makeJwt(), tokenType: 'Bearer', expiresIn: 3600 };
const BODY = JSON.stringify({ token: 'abc' });
const RESEND_BODY = JSON.stringify({ email: 'jd@example.com' });

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
    upstream.reply(200, TOKEN_RESPONSE);
    const request = createTrustedRequest('/api/v1/auth/verify-email', {
      body: BODY,
      headers: { 'x-correlation-id': 'corr-1' }
    });

    // Act
    await handleVerifyEmail(request);

    // Assert
    expect(upstream.calls[0].url).toBe('http://localhost:8080/api/v1/auth/verify-email');
    expect(upstream.calls[0].data).toBe(BODY);
    expect(upstream.lastHeaders()).toMatchObject({ 'x-correlation-id': 'corr-1' });
    expect(upstream.lastHeaders()).not.toHaveProperty('cookie');
    expect(upstream.lastHeaders()).not.toHaveProperty('authorization');
  });

  it('signs the user in by keeping the issued access token in an HttpOnly cookie', async () => {
    // Arrange
    upstream.reply(200, TOKEN_RESPONSE);
    const request = createTrustedRequest('/api/v1/auth/verify-email', { body: BODY });
    const oldCsrfToken = request.cookies.get(getCsrfCookieName())?.value;

    // Act
    const response = await handleVerifyEmail(request);

    // Assert
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toEqual({ user: { id: 'user-1', email: 'jd@example.com' }, expiresIn: 3600 });
    expect(JSON.stringify(body)).not.toContain(TOKEN_RESPONSE.accessToken);
    expect(response.cookies.get(getSessionCookieName())).toMatchObject({
      value: TOKEN_RESPONSE.accessToken,
      httpOnly: true
    });
    expect(response.cookies.get(getCsrfCookieName())?.value).not.toBe(oldCsrfToken);
  });

  it('passes the API refusal through unchanged and starts no session', async () => {
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
    expect(response.cookies.get(getSessionCookieName())).toBeUndefined();
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
  it('passes the address to the API without a session and passes its 202 back', async () => {
    // Arrange
    upstream.reply(202, '');
    const request = createTrustedRequest('/api/v1/auth/resend-verification', {
      body: RESEND_BODY,
      cookies: { [getSessionCookieName()]: makeJwt() }
    });

    // Act
    const response = await handleResendVerification(request);

    // Assert
    expect(response.status).toBe(202);
    expect(upstream.calls[0].url).toBe('http://localhost:8080/api/v1/auth/resend-verification');
    expect(upstream.calls[0].data).toBe(RESEND_BODY);
    expect(upstream.lastHeaders()).not.toHaveProperty('authorization');
    expect(upstream.lastHeaders()).not.toHaveProperty('cookie');
  });

  it('passes a 429 from the API back unchanged', async () => {
    // Arrange
    const problem = { statusCode: 429, title: 'Too Many Requests', detail: 'Try again later.' };
    upstream.reply(429, problem);
    const request = createTrustedRequest('/api/v1/auth/resend-verification', {
      body: RESEND_BODY
    });

    // Act
    const response = await handleResendVerification(request);

    // Assert
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual(problem);
  });

  it('refuses a request without a valid CSRF token and never calls the API', async () => {
    // Arrange
    const request = createRequest('/api/v1/auth/resend-verification', {
      method: 'POST',
      body: RESEND_BODY
    });

    // Act
    const response = await handleResendVerification(request);

    // Assert
    expect(response.status).toBe(403);
    expect(upstream.calls).toHaveLength(0);
  });
});
