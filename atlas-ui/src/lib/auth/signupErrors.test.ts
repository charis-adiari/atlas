import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api/ApiError';
import {
  DEFAULT_SIGNUP_ERROR_MESSAGE,
  getSignupErrorMessage,
  getSignupFieldErrors
} from './signupErrors';

describe('getSignupErrorMessage', () => {
  it("uses the API's message for an API error", () => {
    // Arrange
    const error = new ApiError(409, 'An account with this email already exists.');

    // Act
    const message = getSignupErrorMessage(error);

    // Assert
    expect(message).toBe('An account with this email already exists.');
  });

  it('falls back to a generic message for anything else', () => {
    // Arrange
    const error = new SyntaxError('Unexpected token <');

    // Act
    const message = getSignupErrorMessage(error);

    // Assert
    expect(message).toBe(DEFAULT_SIGNUP_ERROR_MESSAGE);
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
