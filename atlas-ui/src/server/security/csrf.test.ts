import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCsrfCookieName } from '@/server/auth/authCookies';
import { APP_ORIGIN, createRequest, createTrustedRequest } from '@/test/serverHelpers';
import {
  CSRF_INVALID_CODE,
  generateCsrfToken,
  isValidCsrfTokenFormat,
  rejectInvalidCsrf
} from './csrf';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('generateCsrfToken', () => {
  it('creates a different URL-safe token of the expected shape each time', () => {
    // Arrange
    const tokens = [generateCsrfToken(), generateCsrfToken()];

    // Act
    const isEveryTokenValid = tokens.every(isValidCsrfTokenFormat);

    // Assert
    expect(isEveryTokenValid).toBe(true);
    expect(tokens[0]).not.toBe(tokens[1]);
  });

  it.each(['', 'short', 'x'.repeat(44), `${'a'.repeat(42)}!`])(
    'does not accept %j as a token',
    (value) => {
      // Arrange
      const candidate = value;

      // Act
      const isValid = isValidCsrfTokenFormat(candidate);

      // Assert
      expect(isValid).toBe(false);
    }
  );
});

describe('rejectInvalidCsrf', () => {
  it.each(['GET', 'HEAD', 'OPTIONS'])('lets a %s request through without a token', (method) => {
    // Arrange
    const request = createRequest('/api/v1/vaults', { method });

    // Act
    const rejection = rejectInvalidCsrf(request);

    // Assert
    expect(rejection).toBeNull();
  });

  it('lets a state-changing request through when the origin is the app and the cookie matches the header', () => {
    // Arrange
    const request = createTrustedRequest('/api/v1/vaults/migrate');

    // Act
    const rejection = rejectInvalidCsrf(request);

    // Assert
    expect(rejection).toBeNull();
  });

  it('refuses a state-changing request with no token at all', async () => {
    // Arrange
    const request = createRequest('/api/v1/vaults/migrate', { method: 'POST' });

    // Act
    const rejection = rejectInvalidCsrf(request);

    // Assert
    expect(rejection?.status).toBe(403);
    expect((await rejection?.json()).code).toBe(CSRF_INVALID_CODE);
  });

  it('refuses a request that has the header but no cookie, which is what a forged request looks like', () => {
    // Arrange
    const request = createRequest('/api/v1/vaults/migrate', {
      method: 'POST',
      headers: { 'x-csrf-token': generateCsrfToken() }
    });

    // Act
    const rejection = rejectInvalidCsrf(request);

    // Assert
    expect(rejection?.status).toBe(403);
  });

  it('refuses a request that has the cookie but no header', () => {
    // Arrange
    const request = createRequest('/api/v1/vaults/migrate', {
      method: 'POST',
      cookies: { [getCsrfCookieName()]: generateCsrfToken() }
    });

    // Act
    const rejection = rejectInvalidCsrf(request);

    // Assert
    expect(rejection?.status).toBe(403);
  });

  it('refuses a request whose header does not match the cookie', () => {
    // Arrange
    const request = createTrustedRequest('/api/v1/vaults/migrate', {
      headers: { 'x-csrf-token': generateCsrfToken() }
    });

    // Act
    const rejection = rejectInvalidCsrf(request);

    // Assert
    expect(rejection?.status).toBe(403);
  });

  it('refuses a request whose header is a different length from the cookie', () => {
    // Arrange
    const request = createTrustedRequest('/api/v1/vaults/migrate', {
      headers: { 'x-csrf-token': 'short' }
    });

    // Act
    const rejection = rejectInvalidCsrf(request);

    // Assert
    expect(rejection?.status).toBe(403);
  });

  it('refuses a request from another origin even if the token matches', () => {
    // Arrange
    const request = createTrustedRequest('/api/v1/vaults/migrate', {
      headers: { origin: 'https://evil.example.com' }
    });

    // Act
    const rejection = rejectInvalidCsrf(request);

    // Assert
    expect(rejection?.status).toBe(403);
  });

  it('refuses a request the browser says is cross-site even if the token matches', () => {
    // Arrange
    const request = createTrustedRequest('/api/v1/vaults/migrate', {
      headers: { 'sec-fetch-site': 'cross-site' }
    });

    // Act
    const rejection = rejectInvalidCsrf(request);

    // Assert
    expect(rejection?.status).toBe(403);
  });

  it('accepts a same-origin Sec-Fetch-Site', () => {
    // Arrange
    const request = createTrustedRequest('/api/v1/vaults/migrate', {
      headers: { 'sec-fetch-site': 'same-origin' }
    });

    // Act
    const rejection = rejectInvalidCsrf(request);

    // Assert
    expect(rejection).toBeNull();
  });

  it('accepts an origin listed in APP_ORIGINS, as when running behind a reverse proxy', () => {
    // Arrange
    vi.stubEnv('APP_ORIGINS', 'https://atlas.example.com');
    const request = createTrustedRequest('/api/v1/vaults/migrate', {
      headers: { origin: 'https://atlas.example.com' }
    });

    // Act
    const rejection = rejectInvalidCsrf(request);

    // Assert
    expect(rejection).toBeNull();
    expect(APP_ORIGIN).not.toBe('https://atlas.example.com');
  });
});
