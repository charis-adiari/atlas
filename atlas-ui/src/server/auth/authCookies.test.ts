import { NextResponse } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CSRF_COOKIE_SECONDS,
  MAX_SESSION_COOKIE_SECONDS,
  clearCsrfCookie,
  clearSessionCookie,
  getCsrfCookieName,
  getSessionCookieName,
  setCsrfCookie,
  setSessionCookie
} from './authCookies';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('cookie names', () => {
  it('are plain in development', () => {
    // Arrange
    vi.stubEnv('NODE_ENV', 'development');

    // Act
    const names = [getSessionCookieName(), getCsrfCookieName()];

    // Assert
    expect(names).toEqual(['atlas_session', 'atlas_csrf']);
  });

  it('carry the __Host- prefix in production', () => {
    // Arrange
    vi.stubEnv('NODE_ENV', 'production');

    // Act
    const names = [getSessionCookieName(), getCsrfCookieName()];

    // Assert
    expect(names).toEqual(['__Host-atlas_session', '__Host-atlas_csrf']);
  });
});

describe('setSessionCookie', () => {
  it('stores the token in an HttpOnly, SameSite=Lax cookie for the whole site that lasts as long as the token', () => {
    // Arrange
    const response = NextResponse.json({});

    // Act
    setSessionCookie(response, 'the-jwt', 3600);

    // Assert
    expect(response.cookies.get(getSessionCookieName())).toMatchObject({
      value: 'the-jwt',
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 3600,
      secure: false
    });
  });

  it('is Secure in production', () => {
    // Arrange
    vi.stubEnv('NODE_ENV', 'production');
    const response = NextResponse.json({});

    // Act
    setSessionCookie(response, 'the-jwt', 3600);

    // Assert
    const cookie = response.cookies.get('__Host-atlas_session');
    expect(cookie).toMatchObject({ secure: true, httpOnly: true, path: '/' });
    expect(cookie).not.toHaveProperty('domain', expect.anything());
  });

  it('can be made non-Secure for a production build served over plain HTTP', () => {
    // Arrange
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('COOKIE_SECURE', 'false');
    const response = NextResponse.json({});

    // Act
    setSessionCookie(response, 'the-jwt', 3600);

    // Assert
    expect(response.cookies.get('atlas_session')).toMatchObject({ secure: false });
  });

  it('never lasts longer than a day, however long the token claims to', () => {
    // Arrange
    const response = NextResponse.json({});

    // Act
    setSessionCookie(response, 'the-jwt', 365 * 24 * 3600);

    // Assert
    expect(response.cookies.get(getSessionCookieName())?.maxAge).toBe(MAX_SESSION_COOKIE_SECONDS);
  });

  it('lasts at least a second', () => {
    // Arrange
    const response = NextResponse.json({});

    // Act
    setSessionCookie(response, 'the-jwt', 0);

    // Assert
    expect(response.cookies.get(getSessionCookieName())?.maxAge).toBe(1);
  });
});

describe('the CSRF cookie', () => {
  it('is HttpOnly too, because the page gets the token from a response body instead', () => {
    // Arrange
    const response = NextResponse.json({});

    // Act
    setCsrfCookie(response, 'csrf-value');

    // Assert
    expect(response.cookies.get(getCsrfCookieName())).toMatchObject({
      value: 'csrf-value',
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: CSRF_COOKIE_SECONDS
    });
  });
});

describe('clearing cookies', () => {
  it('expires the session cookie with the same attributes it was set with', () => {
    // Arrange
    const response = NextResponse.json({});

    // Act
    clearSessionCookie(response);

    // Assert
    expect(response.cookies.get(getSessionCookieName())).toMatchObject({
      value: '',
      maxAge: 0,
      httpOnly: true,
      path: '/'
    });
  });

  it('expires the CSRF cookie', () => {
    // Arrange
    const response = NextResponse.json({});

    // Act
    clearCsrfCookie(response);

    // Assert
    expect(response.cookies.get(getCsrfCookieName())).toMatchObject({ value: '', maxAge: 0 });
  });
});
