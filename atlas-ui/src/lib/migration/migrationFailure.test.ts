import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api/ApiError';
import { ALREADY_MIGRATED_MESSAGE } from '@/lib/api/migrationApi';
import { UNEXPECTED_MIGRATION_MESSAGE, describeMigrationFailure } from './migrationFailure';
import type { MigrationFailure } from './migrationRunner';

function failureWith(statusCode: number, attempts = 3): MigrationFailure {
  return {
    status: 'failure',
    error: new ApiError(
      statusCode,
      'technical wording: NullPointerException at MigrationService:88'
    ),
    attempts,
    isRetryable: statusCode === 0 || statusCode >= 500,
    hasUnconfirmedUpload: statusCode === 0 || statusCode >= 500
  };
}

describe('describeMigrationFailure', () => {
  it('explains that the data is already on an account when the API says so', () => {
    // Arrange
    const failure: MigrationFailure = {
      ...failureWith(400, 1),
      error: new ApiError(400, ALREADY_MIGRATED_MESSAGE)
    };

    // Act
    const description = describeMigrationFailure(failure);

    // Assert
    expect(description.title).toBe('Some of this data is already on an account');
    expect(description.isExpected).toBe(true);
  });

  it('asks the user to verify their email address when the API requires it', () => {
    // Arrange
    const failure = failureWith(403, 1);

    // Act
    const description = describeMigrationFailure(failure);

    // Assert
    expect(description.title).toBe('Verify your email address first');
    expect(description.isExpected).toBe(true);
  });

  it('describes a lost connection with the number of attempts, as an expected failure', () => {
    // Arrange
    const failure = failureWith(0);

    // Act
    const description = describeMigrationFailure(failure);

    // Assert
    expect(description).toEqual({
      title: 'Connection lost while uploading',
      message: "We tried 3 times and couldn't confirm the upload.",
      isRetryable: true,
      hasUnconfirmedUpload: true,
      isExpected: true
    });
  });

  it('uses the singular for a single attempt', () => {
    // Arrange
    const failure = failureWith(0, 1);

    // Act
    const description = describeMigrationFailure(failure);

    // Assert
    expect(description.message).toBe("We tried 1 time and couldn't confirm the upload.");
  });

  it('describes a server problem as unexpected, so it gets logged', () => {
    // Arrange
    const failure = failureWith(503);

    // Act
    const description = describeMigrationFailure(failure);

    // Assert
    expect(description.title).toBe('The server had a problem');
    expect(description.isExpected).toBe(false);
  });

  it.each([408, 429])('describes status %i as the server being busy', (status) => {
    // Arrange
    const failure = failureWith(status);

    // Act
    const description = describeMigrationFailure(failure);

    // Assert
    expect(description.title).toBe('The server is busy');
    expect(description.isExpected).toBe(true);
  });

  it('tells the user to log in again when the session has expired', () => {
    // Arrange
    const failure = failureWith(401, 1);

    // Act
    const description = describeMigrationFailure(failure);

    // Assert
    expect(description).toMatchObject({
      title: 'Your session has expired',
      message: 'Log in again, then migrate your vaults.',
      isExpected: true
    });
  });

  it.each([[413, 'Your vaults are too large to upload']])(
    'gives a friendly expected message for status %i',
    (statusCode, title) => {
      // Arrange
      const failure = failureWith(statusCode, 1);

      // Act
      const description = describeMigrationFailure(failure);

      // Assert
      expect(description.title).toBe(title);
      expect(description.isExpected).toBe(true);
      expect(description.message).not.toContain('NullPointerException');
    }
  );

  it.each([400, 404, 418])(
    'gives a generic message for the unexpected status %i without any technical wording',
    (statusCode) => {
      // Arrange
      const failure = failureWith(statusCode, 1);

      // Act
      const description = describeMigrationFailure(failure);

      // Assert
      expect(description).toMatchObject({
        title: "We couldn't upload your vaults",
        message: UNEXPECTED_MIGRATION_MESSAGE,
        isExpected: false
      });
    }
  );
});
