import { describe, expect, it } from 'vitest';
import {
  PASSWORD_MAX_LENGTH,
  evaluatePasswordRules,
  isPasswordStrong,
  isPasswordTooLong,
  PASSWORD_MISMATCH_MESSAGE,
  validatePasswordConfirmation
} from './passwordRules';

const API_PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

const SAMPLE_PASSWORDS = [
  '',
  'short1A!',
  'Sh0rt!',
  'alllowercase1!',
  'ALLUPPERCASE1!',
  'NoDigitsHere!',
  'NoSpecial123',
  'Valid-Passw0rd',
  'Pässw0rd',
  'Ünïcödé1',
  'Abcdef1é',
  '        ',
  'Aa1!Aa1!',
  'a'.repeat(PASSWORD_MAX_LENGTH),
  `Aa1!${'a'.repeat(PASSWORD_MAX_LENGTH - 4)}`,
  `Aa1!${'a'.repeat(PASSWORD_MAX_LENGTH - 3)}`
];

describe('evaluatePasswordRules', () => {
  it('reports every requirement as unmet for an empty password', () => {
    // Arrange
    const password = '';

    // Act
    const results = evaluatePasswordRules(password);

    // Assert
    expect(results.map((result) => result.isMet)).toEqual([false, false, false, false, false]);
  });

  it('lists the requirements in the order the user sees them', () => {
    // Arrange
    const password = '';

    // Act
    const results = evaluatePasswordRules(password);

    // Assert
    expect(results.map((result) => result.label)).toEqual([
      'At least 8 characters',
      'One uppercase letter',
      'One lowercase letter',
      'One digit',
      'One special character'
    ]);
  });

  it('marks only the requirements the password meets', () => {
    // Arrange
    const password = 'abcdefg1';

    // Act
    const results = evaluatePasswordRules(password);

    // Assert
    expect(results.map((result) => result.isMet)).toEqual([true, false, true, true, false]);
  });

  it('counts a letter outside A-Z as a special character, like the API does', () => {
    // Arrange
    const password = 'Abcdefg1é';

    // Act
    const results = evaluatePasswordRules(password);

    // Assert
    expect(results.find((result) => result.id === 'special')?.isMet).toBe(true);
  });
});

describe('isPasswordTooLong', () => {
  it('accepts a password of exactly the maximum length', () => {
    // Arrange
    const password = 'a'.repeat(PASSWORD_MAX_LENGTH);

    // Act
    const isTooLong = isPasswordTooLong(password);

    // Assert
    expect(isTooLong).toBe(false);
  });

  it('rejects a password one character over the maximum length', () => {
    // Arrange
    const password = 'a'.repeat(PASSWORD_MAX_LENGTH + 1);

    // Act
    const isTooLong = isPasswordTooLong(password);

    // Assert
    expect(isTooLong).toBe(true);
  });
});

describe('isPasswordStrong', () => {
  it.each(SAMPLE_PASSWORDS)('agrees with the API for %j', (password) => {
    // Arrange
    const isAcceptedByApi = API_PASSWORD_PATTERN.test(password) && password.length <= 72;

    // Act
    const isStrong = isPasswordStrong(password);

    // Assert
    expect(isStrong).toBe(isAcceptedByApi);
  });

  it('rejects a password that meets every requirement but is too long', () => {
    // Arrange
    const password = `Aa1!${'a'.repeat(PASSWORD_MAX_LENGTH)}`;

    // Act
    const isStrong = isPasswordStrong(password);

    // Assert
    expect(isStrong).toBe(false);
  });
});

describe('validatePasswordConfirmation', () => {
  it('accepts a confirmation identical to the password', () => {
    // Arrange
    const password = 'Valid-Passw0rd';

    // Act
    const error = validatePasswordConfirmation(password, 'Valid-Passw0rd');

    // Assert
    expect(error).toBeNull();
  });

  it.each(['Valid-Passw0rD', 'Valid-Passw0rd ', 'valid-passw0rd', ''])(
    'rejects the different confirmation %j',
    (confirmation) => {
      // Arrange
      const password = 'Valid-Passw0rd';

      // Act
      const error = validatePasswordConfirmation(password, confirmation);

      // Assert
      expect(error).toBe(PASSWORD_MISMATCH_MESSAGE);
    }
  );
});
