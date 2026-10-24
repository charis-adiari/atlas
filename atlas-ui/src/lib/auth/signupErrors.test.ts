import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api/ApiError';
import {
  CONNECTION_PROBLEM_MESSAGE,
  ACCOUNT_NOT_CREATED_MESSAGE,
  INVALID_DETAILS_MESSAGE,
  TOO_MANY_ATTEMPTS_MESSAGE,
  UNEXPECTED_SIGNUP_ERROR_MESSAGE,
  describeSignupError,
  getSignupFieldErrors
} from './signupErrors';

describe('describeSignupError', () => {
  it('points at the fields when the API attaches messages to them', () => {
    // Arrange
    const error = new ApiError(400, 'The request is invalid.', {
      email: 'Enter a valid email address'
    });

    // Act
    const description = describeSignupError(error);

    // Assert
    expect(description).toEqual({ message: INVALID_DETAILS_MESSAGE, isExpected: true });
  });

  it.each([
    [400, ACCOUNT_NOT_CREATED_MESSAGE],
    [429, TOO_MANY_ATTEMPTS_MESSAGE],
    [0, CONNECTION_PROBLEM_MESSAGE]
  ])('gives a friendly message for the expected failure %i', (status, expected) => {
    // Arrange
    const error = new ApiError(status, 'technical wording from the server');

    // Act
    const description = describeSignupError(error);

    // Assert
    expect(description).toEqual({ message: expected, isExpected: true });
  });

  it.each([500, 502, 503, 404, 418])(
    'gives a generic message for the unexpected status %i and keeps the server wording off the screen',
    (status) => {
      // Arrange
      const error = new ApiError(status, 'NullPointerException at AuthService:42');

      // Act
      const description = describeSignupError(error);

      // Assert
      expect(description).toEqual({ message: UNEXPECTED_SIGNUP_ERROR_MESSAGE, isExpected: false });
    }
  );

  it('gives a generic message for anything that is not an API error', () => {
    // Arrange
    const error = new SyntaxError('Unexpected token <');

    // Act
    const description = describeSignupError(error);

    // Assert
    expect(description).toEqual({ message: UNEXPECTED_SIGNUP_ERROR_MESSAGE, isExpected: false });
  });
});

describe('getSignupFieldErrors', () => {
  it('picks out the email and password messages', () => {
    // Arrange
    const error = new ApiError(400, 'The request is invalid.', {
      email: 'Enter a valid email address',
      password: 'Password is required',
      body: 'ignored'
    });

    // Act
    const fieldErrors = getSignupFieldErrors(error);

    // Assert
    expect(fieldErrors).toEqual({
      email: 'Enter a valid email address',
      password: 'Password is required'
    });
  });

  it('returns nothing for an error that is not from the API', () => {
    // Arrange
    const error = new Error('boom');

    // Act
    const fieldErrors = getSignupFieldErrors(error);

    // Assert
    expect(fieldErrors).toEqual({});
  });
});
