import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api/ApiError';
import { describeMigrationFailure } from './migrationFailure';
import type { MigrationFailure } from './migrationRunner';

function failureWith(statusCode: number, message: string, attempts = 3): MigrationFailure {
  return {
    status: 'failure',
    error: new ApiError(statusCode, message),
    attempts,
    isRetryable: statusCode === 0 || statusCode >= 500,
    hasUnconfirmedUpload: statusCode === 0 || statusCode >= 500
  };
}

describe('describeMigrationFailure', () => {
  it('describes a lost connection with the number of attempts', () => {
    // Arrange
    const failure = failureWith(0, 'ignored');

    // Act
    const description = describeMigrationFailure(failure);

    // Assert
    expect(description).toEqual({
      title: 'Connection lost while uploading',
      message: "We tried 3 times and couldn't confirm the upload.",
      isRetryable: true,
      hasUnconfirmedUpload: true
    });
  });

  it('uses the singular for a single attempt', () => {
    // Arrange
    const failure = failureWith(0, 'ignored', 1);

    // Act
    const description = describeMigrationFailure(failure);

    // Assert
    expect(description.message).toBe("We tried 1 time and couldn't confirm the upload.");
  });

  it('describes a server problem', () => {
    // Arrange
    const failure = failureWith(503, 'An unexpected error occurred.');

    // Act
    const description = describeMigrationFailure(failure);

    // Assert
    expect(description.title).toBe('The server had a problem');
  });

  it('tells the user to log in again when the session has expired', () => {
    // Arrange
    const failure = failureWith(401, 'Something went wrong.', 1);

    // Act
    const description = describeMigrationFailure(failure);

    // Assert
    expect(description.title).toBe('Your session has expired');
    expect(description.message).toBe('Log in again, then migrate your vaults.');
  });

  it.each([
    [409, 'Some of this data is already on an account'],
    [413, 'Your vaults are too large to upload'],
    [400, "We couldn't upload your vaults"]
  ])("shows the API's own message for status %i", (statusCode, title) => {
    // Arrange
    const failure = failureWith(statusCode, 'Message from the API', 1);

    // Act
    const description = describeMigrationFailure(failure);

    // Assert
    expect(description.title).toBe(title);
    expect(description.message).toBe('Message from the API');
  });
});
