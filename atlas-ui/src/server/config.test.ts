import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_API_ORIGIN,
  getAllowedOrigins,
  getApiOrigin,
  isProduction,
  isSecureCookieRequired
} from './config';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getApiOrigin', () => {
  it('defaults to the local API', () => {
    // Arrange
    vi.stubEnv('API_PROXY_TARGET', '');
    delete process.env.API_PROXY_TARGET;

    // Act
    const origin = getApiOrigin();

    // Assert
    expect(origin).toBe(DEFAULT_API_ORIGIN);
  });

  it('uses API_PROXY_TARGET without a trailing slash', () => {
    // Arrange
    vi.stubEnv('API_PROXY_TARGET', 'https://api.example.com//');

    // Act
    const origin = getApiOrigin();

    // Assert
    expect(origin).toBe('https://api.example.com');
  });
});

describe('isSecureCookieRequired', () => {
  it('is false outside production', () => {
    // Arrange
    vi.stubEnv('NODE_ENV', 'development');

    // Act
    const isSecure = isSecureCookieRequired();

    // Assert
    expect(isProduction()).toBe(false);
    expect(isSecure).toBe(false);
  });

  it('is true in production', () => {
    // Arrange
    vi.stubEnv('NODE_ENV', 'production');

    // Act
    const isSecure = isSecureCookieRequired();

    // Assert
    expect(isProduction()).toBe(true);
    expect(isSecure).toBe(true);
  });

  it.each([
    ['false', false],
    ['true', true]
  ])('can be overridden with COOKIE_SECURE=%s', (value, expected) => {
    // Arrange
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('COOKIE_SECURE', value);

    // Act
    const isSecure = isSecureCookieRequired();

    // Assert
    expect(isSecure).toBe(expected);
  });
});

describe('getAllowedOrigins', () => {
  it("defaults to the request's own origin", () => {
    // Arrange
    delete process.env.APP_ORIGINS;

    // Act
    const origins = getAllowedOrigins('http://localhost:3000');

    // Assert
    expect(origins).toEqual(['http://localhost:3000']);
  });

  it('uses the origins listed in APP_ORIGINS, trimmed', () => {
    // Arrange
    vi.stubEnv('APP_ORIGINS', ' https://atlas.example.com/ , https://www.atlas.example.com ');

    // Act
    const origins = getAllowedOrigins('http://internal:3000');

    // Assert
    expect(origins).toEqual(['https://atlas.example.com', 'https://www.atlas.example.com']);
  });
});
