import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HttpMock, TEST_CSRF_TOKEN, jsonReply, problemReply } from '@/test/HttpMock';
import { ApiError } from './ApiError';
import { fetchVerificationStatus, resendVerification, verifyEmail } from './authApi';

const http = new HttpMock();

beforeEach(() => {
  http.install();
});

afterEach(() => {
  http.uninstall();
});

describe('verifyEmail', () => {
  it('posts the token to the verify endpoint with the CSRF token', async () => {
    // Arrange
    http.handler.mockResolvedValue(jsonReply(204));

    // Act
    await verifyEmail('abc');

    // Assert
    const request = http.handler.mock.calls[0][0];
    expect(request.path).toBe('/auth/verify-email');
    expect(request.body).toEqual({ token: 'abc' });
    expect(request.headers['x-csrf-token']).toBe(TEST_CSRF_TOKEN);
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
  it('posts to the resend endpoint', async () => {
    // Arrange
    http.handler.mockResolvedValue(jsonReply(204));

    // Act
    await resendVerification();

    // Assert
    expect(http.handler.mock.calls[0][0].path).toBe('/auth/resend-verification');
  });
});

describe('fetchVerificationStatus', () => {
  it.each([true, false])('returns %s when the API says so', async (isVerified) => {
    // Arrange
    http.handler.mockResolvedValue(jsonReply(200, { isVerified }));

    // Act
    const result = await fetchVerificationStatus();

    // Assert
    expect(result).toBe(isVerified);
  });

  it('fails when the answer cannot be understood', async () => {
    // Arrange
    http.handler.mockResolvedValue(jsonReply(200, { something: 'else' }));

    // Act
    const error = await fetchVerificationStatus().catch((caught: unknown) => caught);

    // Assert
    expect(error).toBeInstanceOf(ApiError);
  });
});
