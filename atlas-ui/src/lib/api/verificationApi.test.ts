import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HttpMock, TEST_CSRF_TOKEN, jsonReply, problemReply } from '@/test/HttpMock';
import { ApiError } from './ApiError';
import {
  EMAIL_NOT_VERIFIED_MESSAGE,
  isEmailNotVerified,
  resendVerification,
  signup,
  verifyEmail
} from './authApi';

const http = new HttpMock();
const USER = { id: 'user-1', email: 'jd@example.com' };

beforeEach(() => {
  http.install();
});

afterEach(() => {
  http.uninstall();
});

describe('signup', () => {
  it('returns the address the verification link was sent to', async () => {
    // Arrange
    http.handler.mockResolvedValue(
      jsonReply(201, { status: 'verification_required', email: 'jd@example.com' })
    );

    // Act
    const result = await signup({ email: 'jd@example.com', password: 'Valid-Passw0rd' });

    // Assert
    expect(result).toEqual({ status: 'verification_required', email: 'jd@example.com' });
  });

  it('fails when the answer cannot be understood', async () => {
    // Arrange
    http.handler.mockResolvedValue(jsonReply(201, { user: USER, expiresIn: 3600 }));

    // Act
    const error = await signup({ email: 'jd@example.com', password: 'x' }).catch(
      (caught: unknown) => caught
    );

    // Assert
    expect(error).toBeInstanceOf(ApiError);
  });
});

describe('verifyEmail', () => {
  it('posts the token to the verify endpoint with the CSRF token and returns the new session', async () => {
    // Arrange
    http.handler.mockResolvedValue(jsonReply(200, { user: USER, expiresIn: 3600 }));

    // Act
    const result = await verifyEmail('abc');

    // Assert
    const request = http.handler.mock.calls[0][0];
    expect(request.path).toBe('/auth/verify-email');
    expect(request.body).toEqual({ token: 'abc' });
    expect(request.headers['x-csrf-token']).toBe(TEST_CSRF_TOKEN);
    expect(result).toEqual({ user: USER, expiresIn: 3600 });
  });

  it('fails with the API error when the token is refused', async () => {
    // Arrange
    http.handler.mockResolvedValue(problemReply(400, 'The verification link is invalid.'));

    // Act
    const error = await verifyEmail('abc').catch((caught: unknown) => caught);

    // Assert
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).statusCode).toBe(400);
  });
});

describe('resendVerification', () => {
  it('posts the address to the resend endpoint', async () => {
    // Arrange
    http.handler.mockResolvedValue(jsonReply(202));

    // Act
    await resendVerification('jd@example.com');

    // Assert
    const request = http.handler.mock.calls[0][0];
    expect(request.path).toBe('/auth/resend-verification');
    expect(request.body).toEqual({ email: 'jd@example.com' });
  });
});

describe('isEmailNotVerified', () => {
  it('recognises the refusal of an account whose address is not verified', () => {
    // Arrange
    const error = new ApiError(400, EMAIL_NOT_VERIFIED_MESSAGE);

    // Act & Assert
    expect(isEmailNotVerified(error)).toBe(true);
  });

  it.each([
    new ApiError(403, 'Forbidden.', {}, { code: 'csrf_invalid' }),
    new ApiError(400, 'Some other problem.'),
    new ApiError(401, EMAIL_NOT_VERIFIED_MESSAGE),
    new Error('boom')
  ])('ignores any other failure', (error) => {
    // Act & Assert
    expect(isEmailNotVerified(error)).toBe(false);
  });
});
