import { describe, expect, it } from 'vitest';
import {
  EMAIL_INVALID_MESSAGE,
  EMAIL_MAX_LENGTH,
  EMAIL_REQUIRED_MESSAGE,
  EMAIL_TOO_LONG_MESSAGE,
  normalizeEmail,
  validateEmail
} from './emailRules';

describe('normalizeEmail', () => {
  it('trims and lower-cases the address', () => {
    // Arrange
    const email = '  You@Example.COM ';

    // Act
    const normalized = normalizeEmail(email);

    // Assert
    expect(normalized).toBe('you@example.com');
  });
});

describe('validateEmail', () => {
  it('accepts a normal address', () => {
    // Arrange
    const email = 'you@example.com';

    // Act
    const error = validateEmail(email);

    // Assert
    expect(error).toBeNull();
  });

  it.each(['', '   '])('asks for an address when given %j', (email) => {
    // Arrange
    const expected = EMAIL_REQUIRED_MESSAGE;

    // Act
    const error = validateEmail(email);

    // Assert
    expect(error).toBe(expected);
  });

  it.each(['plainaddress', '@example.com', 'you@', 'you @example.com', 'a@@b.com'])(
    'rejects the malformed address %j',
    (email) => {
      // Arrange
      const expected = EMAIL_INVALID_MESSAGE;

      // Act
      const error = validateEmail(email);

      // Assert
      expect(error).toBe(expected);
    }
  );

  it('rejects an address longer than the API accepts', () => {
    // Arrange
    const email = `${'a'.repeat(EMAIL_MAX_LENGTH)}@example.com`;

    // Act
    const error = validateEmail(email);

    // Assert
    expect(error).toBe(EMAIL_TOO_LONG_MESSAGE);
  });
});
