import { isAlreadyMigrated } from '@/lib/api/migrationApi';
import type { MigrationFailure } from './migrationRunner';

export const UNEXPECTED_MIGRATION_MESSAGE =
  'Something unexpected went wrong. Nothing was uploaded, and your vaults are still on this device.';

const UNAUTHORIZED_STATUS = 401;
const REQUEST_TIMEOUT_STATUS = 408;
const FORBIDDEN_STATUS = 403;
const PAYLOAD_TOO_LARGE_STATUS = 413;
const TOO_MANY_REQUESTS_STATUS = 429;
const FIRST_SERVER_ERROR_STATUS = 500;

/**
 * Represents what the user is told about a migration that did not finish. isExpected is false for failures that point
 * at a bug or an outage; those get a generic message and should be logged.
 */
export interface FailureDescription {
  title: string;
  message: string;
  isRetryable: boolean;
  hasUnconfirmedUpload: boolean;
  isExpected: boolean;
}

interface FailureText {
  title: string;
  message: string;
  isExpected: boolean;
}

const ALREADY_MIGRATED_TEXT: FailureText = {
  title: 'Some of this data is already on an account',
  message: 'Some of your vaults are already linked to an account, so nothing was uploaded.',
  isExpected: true
};

/**
 * Describes a failed migration for the user, in terms of what happened and what they can do next, without technical
 * wording from the server.
 */
export function describeMigrationFailure(failure: MigrationFailure): FailureDescription {
  const { error, attempts, isRetryable, hasUnconfirmedUpload } = failure;

  const text = isAlreadyMigrated(error)
    ? ALREADY_MIGRATED_TEXT
    : describeStatus(error.statusCode, attempts);

  return { ...text, isRetryable, hasUnconfirmedUpload };
}

/**
 * Picks the title and message for a status.
 */
function describeStatus(statusCode: number, attempts: number): FailureText {
  const triedMessage = `We tried ${attempts} ${attempts === 1 ? 'time' : 'times'} and couldn't confirm the upload.`;

  if (statusCode === 0) {
    return { title: 'Connection lost while uploading', message: triedMessage, isExpected: true };
  }
  if (statusCode >= FIRST_SERVER_ERROR_STATUS) {
    return { title: 'The server had a problem', message: triedMessage, isExpected: false };
  }
  if (statusCode === REQUEST_TIMEOUT_STATUS || statusCode === TOO_MANY_REQUESTS_STATUS) {
    return { title: 'The server is busy', message: triedMessage, isExpected: true };
  }
  return describeRejection(statusCode);
}

/**
 * Picks the title and message for a request the server answered without accepting it.
 */
function describeRejection(statusCode: number): FailureText {
  if (statusCode === UNAUTHORIZED_STATUS) {
    return {
      title: 'Your session has expired',
      message: 'Log in again, then migrate your vaults.',
      isExpected: true
    };
  }
  if (statusCode === FORBIDDEN_STATUS) {
    return {
      title: 'Verify your email address first',
      message: 'Open the link we emailed you, then migrate your vaults.',
      isExpected: true
    };
  }
  if (statusCode === PAYLOAD_TOO_LARGE_STATUS) {
    return {
      title: 'Your vaults are too large to upload',
      message: 'They are too big to upload in one go.',
      isExpected: true
    };
  }
  return {
    title: "We couldn't upload your vaults",
    message: UNEXPECTED_MIGRATION_MESSAGE,
    isExpected: false
  };
}
