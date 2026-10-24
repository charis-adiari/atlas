import { describe, expect, it } from 'vitest';
import { makeJwt } from '@/test/serverHelpers';
import { readSessionClaims } from './jwtClaims';

const NOW = new Date('2026-10-12T12:00:00Z').getTime();
const IN_AN_HOUR = Math.floor(NOW / 1000) + 3600;

describe('readSessionClaims', () => {
  it('reads the user and the expiry of a valid token', () => {
    // Arrange
    const token = makeJwt({ sub: 'user-7', email: 'a@b.com', exp: IN_AN_HOUR });

    // Act
    const claims = readSessionClaims(token, NOW);

    // Assert
    expect(claims).toEqual({ userId: 'user-7', email: 'a@b.com', expiresAt: IN_AN_HOUR * 1000 });
  });

  it('returns null for a token that has expired', () => {
    // Arrange
    const token = makeJwt({ exp: Math.floor(NOW / 1000) - 1 });

    // Act
    const claims = readSessionClaims(token, NOW);

    // Assert
    expect(claims).toBeNull();
  });

  it.each([
    ['no token', undefined],
    ['an empty token', ''],
    ['text that is not a token', 'not-a-token'],
    ['a token with two parts', 'aaa.bbb'],
    ['a token with a payload that is not base64 JSON', 'aaa.%%%.ccc'],
    ['a token whose payload is not an object', `a.${Buffer.from('[1,2]').toString('base64url')}.c`],
    ['a token that is far too long', `a.${'b'.repeat(9000)}.c`]
  ])('returns null for %s', (_description, token) => {
    // Arrange
    const value = token;

    // Act
    const claims = readSessionClaims(value, NOW);

    // Assert
    expect(claims).toBeNull();
  });

  it.each([
    ['sub', { sub: undefined }],
    ['email', { email: undefined }],
    ['exp', { exp: 'soon' }]
  ])('returns null when the %s claim is missing or the wrong type', (_claim, override) => {
    // Arrange
    const token = makeJwt({ exp: IN_AN_HOUR, ...override });

    // Act
    const claims = readSessionClaims(token, NOW);

    // Assert
    expect(claims).toBeNull();
  });
});
