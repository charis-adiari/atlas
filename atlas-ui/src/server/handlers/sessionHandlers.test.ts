import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getCsrfCookieName, getSessionCookieName } from '@/server/auth/authCookies';
import { generateCsrfToken } from '@/server/security/csrf';
import {
  UpstreamMock,
  createRequest,
  createTrustedRequest,
  makeJwt,
  silenceServerLog
} from '@/test/serverHelpers';
import {
  MAX_AUTH_BODY_BYTES,
  handleCsrf,
  handleLogin,
  handleLogout,
  handleSession,
  handleSignup
} from './sessionHandlers';

const upstream = new UpstreamMock();
const USER = { id: 'user-1', email: 'jd@example.com' };
const TOKEN_RESPONSE = {
  accessToken: makeJwt(),
  tokenType: 'Bearer',
  expiresIn: 3600
};
const CREDENTIALS = JSON.stringify({ email: 'jd@example.com', password: 'Valid-Passw0rd' });

beforeEach(() => {
  upstream.install();
});

afterEach(() => {
  upstream.uninstall();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('handleSignup', () => {
  it('passes the API answer through unchanged and starts no session', async () => {
    // Arrange
    const created = { status: 'verification_required', email: 'jd@example.com' };
    upstream.reply(201, created);
    const request = createTrustedRequest('/api/v1/auth/signup', { body: CREDENTIALS });

    // Act
    const response = await handleSignup(request);

    // Assert
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(created);
    expect(response.cookies.get(getSessionCookieName())).toBeUndefined();
    expect(response.cookies.get(getCsrfCookieName())).toBeUndefined();
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('forwards the credentials to the API without any of the browser cookies', async () => {
    // Arrange
    upstream.reply(201, { status: 'verification_required', email: 'jd@example.com' });
    const request = createTrustedRequest('/api/v1/auth/signup', {
      body: CREDENTIALS,
      cookies: { [getSessionCookieName()]: 'stale-session' },
      headers: { 'x-correlation-id': 'corr-1' }
    });

    // Act
    await handleSignup(request);

    // Assert
    expect(upstream.calls[0].url).toBe('http://localhost:8080/api/v1/auth/signup');
    expect(upstream.calls[0].data).toBe(CREDENTIALS);
    expect(upstream.lastHeaders()).toMatchObject({ 'x-correlation-id': 'corr-1' });
    expect(upstream.lastHeaders()).not.toHaveProperty('cookie');
    expect(upstream.lastHeaders()).not.toHaveProperty('authorization');
  });

  it('passes the API error through unchanged and sets no cookie', async () => {
    // Arrange
    const problem = {
      statusCode: 400,
      title: 'Bad Request',
      detail: 'The account could not be created with the details provided.'
    };
    upstream.reply(400, problem, { 'x-correlation-id': 'corr-9' });
    const request = createTrustedRequest('/api/v1/auth/signup', { body: CREDENTIALS });

    // Act
    const response = await handleSignup(request);

    // Assert
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual(problem);
    expect(response.headers.get('x-correlation-id')).toBe('corr-9');
    expect(response.cookies.get(getSessionCookieName())).toBeUndefined();
  });

  it('refuses a request without a valid CSRF token and never calls the API', async () => {
    // Arrange
    const request = createRequest('/api/v1/auth/signup', { method: 'POST', body: CREDENTIALS });

    // Act
    const response = await handleSignup(request);

    // Assert
    expect(response.status).toBe(403);
    expect((await response.json()).code).toBe('csrf_invalid');
    expect(upstream.calls).toHaveLength(0);
  });

  it('refuses an oversized body', async () => {
    // Arrange
    const request = createTrustedRequest('/api/v1/auth/signup', {
      body: 'x'.repeat(MAX_AUTH_BODY_BYTES + 1)
    });

    // Act
    const response = await handleSignup(request);

    // Assert
    expect(response.status).toBe(413);
    expect(upstream.calls).toHaveLength(0);
  });

  it('answers 502 with a generic message, and logs the reason, when the API is unreachable', async () => {
    // Arrange
    const log = silenceServerLog();
    upstream.fail();
    const request = createTrustedRequest('/api/v1/auth/signup', { body: CREDENTIALS });

    // Act
    const response = await handleSignup(request);

    // Assert
    const body = await response.json();
    expect(response.status).toBe(502);
    expect(body.detail).toBe('The service is temporarily unavailable.');
    expect(JSON.stringify(body)).not.toContain('ECONNREFUSED');
    expect(log).toHaveBeenCalledWith(
      '[atlas-server] upstream call failed',
      expect.objectContaining({ reason: 'ECONNREFUSED' })
    );
  });
});

describe('handleLogin', () => {
  it('keeps the access token in an HttpOnly cookie and tells the page only who signed in and for how long', async () => {
    // Arrange
    upstream.reply(200, TOKEN_RESPONSE);
    const request = createTrustedRequest('/api/v1/auth/login', { body: CREDENTIALS });

    // Act
    const response = await handleLogin(request);

    // Assert
    const body = await response.json();
    expect(upstream.calls[0].url).toBe('http://localhost:8080/api/v1/auth/login');
    expect(response.status).toBe(200);
    expect(body).toEqual({ user: USER, expiresIn: 3600 });
    expect(JSON.stringify(body)).not.toContain(TOKEN_RESPONSE.accessToken);
    expect(response.cookies.get(getSessionCookieName())).toMatchObject({
      value: TOKEN_RESPONSE.accessToken,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 3600
    });
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('reads who signed in from the claims of the access token, because the API sends no user', async () => {
    // Arrange
    const accessToken = makeJwt({ sub: 'user-7', email: 'ada@example.com' });
    upstream.reply(200, { accessToken, tokenType: 'Bearer', expiresIn: 3600 });
    const request = createTrustedRequest('/api/v1/auth/login', { body: CREDENTIALS });

    // Act
    const response = await handleLogin(request);

    // Assert
    expect(await response.json()).toEqual({
      user: { id: 'user-7', email: 'ada@example.com' },
      expiresIn: 3600
    });
  });

  it('replaces the CSRF token when a session starts', async () => {
    // Arrange
    upstream.reply(200, TOKEN_RESPONSE);
    const request = createTrustedRequest('/api/v1/auth/login', { body: CREDENTIALS });
    const oldToken = request.cookies.get(getCsrfCookieName())?.value;

    // Act
    const response = await handleLogin(request);

    // Assert
    const newToken = response.cookies.get(getCsrfCookieName())?.value;
    expect(newToken).toBeDefined();
    expect(newToken).not.toBe(oldToken);
  });

  it('passes on the refusal of an unverified account and starts no session', async () => {
    // Arrange
    const problem = {
      statusCode: 400,
      title: 'Bad Request',
      detail: 'Verify your email address before signing in.'
    };
    upstream.reply(400, problem);
    const request = createTrustedRequest('/api/v1/auth/login', { body: CREDENTIALS });

    // Act
    const response = await handleLogin(request);

    // Assert
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual(problem);
    expect(response.cookies.get(getSessionCookieName())).toBeUndefined();
  });

  it('answers 502 and sets no cookie when the access token cannot be read', async () => {
    // Arrange
    silenceServerLog();
    upstream.reply(200, { accessToken: 'not-a-token', tokenType: 'Bearer', expiresIn: 3600 });
    const request = createTrustedRequest('/api/v1/auth/login', { body: CREDENTIALS });

    // Act
    const response = await handleLogin(request);

    // Assert
    expect(response.status).toBe(502);
    expect(response.cookies.get(getSessionCookieName())).toBeUndefined();
  });

  it.each([
    ['text that is not JSON', '<html></html>'],
    ['a body without a token', JSON.stringify({ user: USER, expiresIn: 3600 })],
    ['a body with an empty token', JSON.stringify({ ...TOKEN_RESPONSE, accessToken: '' })]
  ])('answers 502 and sets no cookie when the API succeeds with %s', async (_description, body) => {
    // Arrange
    silenceServerLog();
    upstream.reply(200, body);
    const request = createTrustedRequest('/api/v1/auth/login', { body: CREDENTIALS });

    // Act
    const response = await handleLogin(request);

    // Assert
    expect(response.status).toBe(502);
    expect(response.cookies.get(getSessionCookieName())).toBeUndefined();
  });
});

describe('handleLogout', () => {
  it('removes both cookies and answers 204', () => {
    // Arrange
    const request = createTrustedRequest('/api/v1/auth/logout', {
      cookies: { [getSessionCookieName()]: makeJwt() }
    });

    // Act
    const response = handleLogout(request);

    // Assert
    expect(response.status).toBe(204);
    expect(response.cookies.get(getSessionCookieName())).toMatchObject({ value: '', maxAge: 0 });
    expect(response.cookies.get(getCsrfCookieName())).toMatchObject({ value: '', maxAge: 0 });
  });

  it('refuses a logout without a valid CSRF token and leaves the cookies alone', () => {
    // Arrange
    const request = createRequest('/api/v1/auth/logout', { method: 'POST' });

    // Act
    const response = handleLogout(request);

    // Assert
    expect(response.status).toBe(403);
    expect(response.cookies.get(getSessionCookieName())).toBeUndefined();
  });
});

describe('handleSession', () => {
  it('reports the signed-in user and when the session ends', async () => {
    // Arrange
    const exp = Math.floor(Date.now() / 1000) + 600;
    const request = createRequest('/api/v1/auth/session', {
      cookies: { [getSessionCookieName()]: makeJwt({ sub: 'u9', email: 'x@y.com', exp }) }
    });

    // Act
    const response = handleSession(request);

    // Assert
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      user: { id: 'u9', email: 'x@y.com' },
      expiresAt: exp * 1000
    });
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('never returns the token itself', async () => {
    // Arrange
    const token = makeJwt();
    const request = createRequest('/api/v1/auth/session', {
      cookies: { [getSessionCookieName()]: token }
    });

    // Act
    const response = handleSession(request);

    // Assert
    expect(await response.text()).not.toContain(token);
  });

  it('answers 401 when there is no cookie', async () => {
    // Arrange
    const request = createRequest('/api/v1/auth/session');

    // Act
    const response = handleSession(request);

    // Assert
    expect(response.status).toBe(401);
    expect((await response.json()).detail).toBe('There is no active session.');
    expect(response.cookies.get(getSessionCookieName())).toBeUndefined();
  });

  it('answers 401 and removes the cookie when the token has expired', () => {
    // Arrange
    const expired = makeJwt({ exp: Math.floor(Date.now() / 1000) - 10 });
    const request = createRequest('/api/v1/auth/session', {
      cookies: { [getSessionCookieName()]: expired }
    });

    // Act
    const response = handleSession(request);

    // Assert
    expect(response.status).toBe(401);
    expect(response.cookies.get(getSessionCookieName())).toMatchObject({ value: '', maxAge: 0 });
  });

  it('answers 401 and removes the cookie when it is not a token', () => {
    // Arrange
    const request = createRequest('/api/v1/auth/session', {
      cookies: { [getSessionCookieName()]: 'garbage' }
    });

    // Act
    const response = handleSession(request);

    // Assert
    expect(response.status).toBe(401);
    expect(response.cookies.get(getSessionCookieName())).toMatchObject({ maxAge: 0 });
  });
});

describe('handleCsrf', () => {
  it('creates a token and a cookie for a browser that has none, and the two match', async () => {
    // Arrange
    const request = createRequest('/api/v1/auth/csrf');

    // Act
    const response = handleCsrf(request);

    // Assert
    const { csrfToken } = await response.json();
    expect(csrfToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(response.cookies.get(getCsrfCookieName())).toMatchObject({
      value: csrfToken,
      httpOnly: true
    });
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('hands back the token the browser already has without setting a new cookie', async () => {
    // Arrange
    const existing = generateCsrfToken();
    const request = createRequest('/api/v1/auth/csrf', {
      cookies: { [getCsrfCookieName()]: existing }
    });

    // Act
    const response = handleCsrf(request);

    // Assert
    expect((await response.json()).csrfToken).toBe(existing);
    expect(response.cookies.get(getCsrfCookieName())).toBeUndefined();
  });

  it('replaces a cookie that is not a valid token', async () => {
    // Arrange
    const request = createRequest('/api/v1/auth/csrf', {
      cookies: { [getCsrfCookieName()]: 'tampered' }
    });

    // Act
    const response = handleCsrf(request);

    // Assert
    const { csrfToken } = await response.json();
    expect(csrfToken).not.toBe('tampered');
    expect(response.cookies.get(getCsrfCookieName())?.value).toBe(csrfToken);
  });
});
