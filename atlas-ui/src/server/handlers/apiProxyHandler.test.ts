import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getSessionCookieName } from '@/server/auth/authCookies';
import {
  UpstreamMock,
  createRequest,
  createTrustedRequest,
  makeJwt,
  silenceServerLog
} from '@/test/serverHelpers';
import { MAX_PROXY_BODY_BYTES, handleApiProxy } from './apiProxyHandler';

const upstream = new UpstreamMock();
const TOKEN = makeJwt();
const SESSION = { [getSessionCookieName()]: TOKEN };

function context(...path: string[]) {
  return { params: Promise.resolve({ path }) };
}

beforeEach(() => {
  upstream.install();
});

afterEach(() => {
  upstream.uninstall();
  vi.restoreAllMocks();
});

describe('handleApiProxy authentication', () => {
  it('refuses a request without a session cookie and never calls the API', async () => {
    // Arrange
    const request = createRequest('/api/v1/vaults/1');

    // Act
    const response = await handleApiProxy(request, context('vaults', '1'));

    // Assert
    expect(response.status).toBe(401);
    expect(upstream.calls).toHaveLength(0);
    expect(response.cookies.get(getSessionCookieName())).toBeUndefined();
  });

  it('refuses a request whose token has expired and removes the cookie', async () => {
    // Arrange
    const expired = makeJwt({ exp: Math.floor(Date.now() / 1000) - 5 });
    const request = createRequest('/api/v1/vaults/1', {
      cookies: { [getSessionCookieName()]: expired }
    });

    // Act
    const response = await handleApiProxy(request, context('vaults', '1'));

    // Assert
    expect(response.status).toBe(401);
    expect(response.cookies.get(getSessionCookieName())).toMatchObject({ value: '', maxAge: 0 });
    expect(upstream.calls).toHaveLength(0);
  });

  it('removes the cookie when the API itself says the token is no longer valid', async () => {
    // Arrange
    upstream.reply(401, '');
    const request = createRequest('/api/v1/vaults/1', { cookies: SESSION });

    // Act
    const response = await handleApiProxy(request, context('vaults', '1'));

    // Assert
    expect(response.status).toBe(401);
    expect(response.cookies.get(getSessionCookieName())).toMatchObject({ maxAge: 0 });
  });
});

describe('handleApiProxy forwarding', () => {
  it('sends the token to the API as a Bearer header and passes the answer back', async () => {
    // Arrange
    const counts = { vaults: 1, folders: 0, files: 0, backlinks: 0 };
    upstream.reply(201, counts, { 'x-correlation-id': 'corr-5' });
    const body = JSON.stringify({ vaults: [] });
    const request = createTrustedRequest('/api/v1/vaults/migrate', { body, cookies: SESSION });

    // Act
    const response = await handleApiProxy(request, context('vaults', 'migrate'));

    // Assert
    expect(upstream.calls[0].method?.toUpperCase()).toBe('POST');
    expect(upstream.calls[0]).toMatchObject({
      url: 'http://localhost:8080/api/v1/vaults/migrate',
      data: body
    });
    expect(upstream.lastHeaders().authorization).toBe(`Bearer ${TOKEN}`);
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(counts);
    expect(response.headers.get('x-correlation-id')).toBe('corr-5');
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('does not pass the browser cookies or the CSRF token on to the API', async () => {
    // Arrange
    upstream.reply(200, {});
    const request = createTrustedRequest('/api/v1/vaults/migrate', {
      body: '{}',
      cookies: SESSION
    });

    // Act
    await handleApiProxy(request, context('vaults', 'migrate'));

    // Assert
    const headers = upstream.lastHeaders();
    expect(headers).not.toHaveProperty('cookie');
    expect(headers).not.toHaveProperty('x-csrf-token');
    expect(headers).not.toHaveProperty('origin');
  });

  it('forwards the query string and needs no CSRF token or body for a read', async () => {
    // Arrange
    upstream.reply(200, []);
    const request = createRequest('/api/v1/roles/7?expand=true', { cookies: SESSION });

    // Act
    const response = await handleApiProxy(request, context('roles', '7'));

    // Assert
    expect(response.status).toBe(200);
    expect(upstream.calls[0].url).toBe('http://localhost:8080/api/v1/roles/7?expand=true');
    expect(upstream.calls[0].data).toBeUndefined();
  });

  it('answers with no body when the API does', async () => {
    // Arrange
    upstream.reply(204, '');
    const request = createTrustedRequest('/api/v1/vaults/1', {
      method: 'DELETE',
      cookies: SESSION
    });

    // Act
    const response = await handleApiProxy(request, context('vaults', '1'));

    // Assert
    expect(response.status).toBe(204);
    expect(await response.text()).toBe('');
  });

  it('answers 502 with a generic message when the API is unreachable', async () => {
    // Arrange
    silenceServerLog();
    upstream.fail();
    const request = createRequest('/api/v1/vaults/1', { cookies: SESSION });

    // Act
    const response = await handleApiProxy(request, context('vaults', '1'));

    // Assert
    expect(response.status).toBe(502);
    expect((await response.json()).detail).toBe('The service is temporarily unavailable.');
  });
});

describe('handleApiProxy protections', () => {
  it('refuses a state-changing request without a valid CSRF token', async () => {
    // Arrange
    const request = createRequest('/api/v1/vaults/migrate', {
      method: 'POST',
      body: '{}',
      cookies: SESSION
    });

    // Act
    const response = await handleApiProxy(request, context('vaults', 'migrate'));

    // Assert
    expect(response.status).toBe(403);
    expect(upstream.calls).toHaveLength(0);
  });

  it.each([
    ['a parent-directory segment', ['vaults', '..', 'secret']],
    ['an encoded parent-directory segment', ['vaults', '%2e%2e']],
    ['a segment with a space', ['va ults']],
    ['a segment with a dot', ['vaults.json']],
    ['a segment with a slash', ['vaults/other']],
    ['an empty path', []],
    ["the server's own auth routes", ['auth', 'signup']]
  ])('refuses %s', async (_description, path) => {
    // Arrange
    const request = createRequest('/api/v1/x', { cookies: SESSION });

    // Act
    const response = await handleApiProxy(request, context(...path));

    // Assert
    expect(response.status).toBe(404);
    expect(upstream.calls).toHaveLength(0);
  });

  it('refuses a body that is too large', async () => {
    // Arrange
    const request = createTrustedRequest('/api/v1/vaults/migrate', {
      body: 'x'.repeat(MAX_PROXY_BODY_BYTES + 1),
      cookies: SESSION
    });

    // Act
    const response = await handleApiProxy(request, context('vaults', 'migrate'));

    // Assert
    expect(response.status).toBe(413);
    expect(upstream.calls).toHaveLength(0);
  });
});
