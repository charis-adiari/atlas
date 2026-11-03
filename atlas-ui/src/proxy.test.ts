import { describe, expect, it } from 'vitest';
import { getSessionCookieName } from '@/server/auth/authCookies';
import { createRequest, makeJwt } from '@/test/serverHelpers';
import { config, proxy } from './proxy';

describe('proxy', () => {
  it('lets a signed-in user through to a protected page', () => {
    // Arrange
    const request = createRequest('/account', { cookies: { [getSessionCookieName()]: makeJwt() } });

    // Act
    const response = proxy(request);

    // Assert
    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(response.status).toBe(200);
  });

  it('sends an anonymous visitor to the home page', () => {
    // Arrange
    const request = createRequest('/account');

    // Act
    const response = proxy(request);

    // Assert
    expect(response.status).toBe(307);
    expect(new URL(response.headers.get('location') ?? '').pathname).toBe('/');
    expect(new URL(response.headers.get('location') ?? '').search).toBe('?auth=required');
    expect(response.cookies.get(getSessionCookieName())).toBeUndefined();
  });

  it('sends a visitor whose token has expired to the home page and removes the stale cookie', () => {
    // Arrange
    const expired = makeJwt({ exp: Math.floor(Date.now() / 1000) - 5 });
    const request = createRequest('/account', { cookies: { [getSessionCookieName()]: expired } });

    // Act
    const response = proxy(request);

    // Assert
    expect(response.status).toBe(307);
    expect(response.cookies.get(getSessionCookieName())).toMatchObject({ value: '', maxAge: 0 });
  });

  it('sends a visitor with a cookie that is not a token to the home page', () => {
    // Arrange
    const request = createRequest('/account/settings', {
      cookies: { [getSessionCookieName()]: 'garbage' }
    });

    // Act
    const response = proxy(request);

    // Assert
    expect(response.status).toBe(307);
  });

  it('guards the account pages', () => {
    // Arrange
    const matcher = config.matcher;

    // Act
    const guardsAccount = matcher.includes('/account/:path*');

    // Assert
    expect(guardsAccount).toBe(true);
  });
});
