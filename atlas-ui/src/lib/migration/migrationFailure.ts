import type { MigrationFailure } from './migrationRunner';

const UNAUTHORIZED_STATUS = 401;
const CONFLICT_STATUS = 409;
const PAYLOAD_TOO_LARGE_STATUS = 413;
const FIRST_SERVER_ERROR_STATUS = 500;

/**
 * Represents what the user is told about a migration that did not finish.
 */
export interface FailureDescription {
  title: string;
  message: string;
  isRetryable: boolean;
  hasUnconfirmedUpload: boolean;
}

/**
 * Describes a failed migration for the user, in terms of what happened and what they can do next.
 */
export function describeMigrationFailure(failure: MigrationFailure): FailureDescription {
  const { error, attempts, isRetryable, hasUnconfirmedUpload } = failure;
  const { title, message } = describeError(error.statusCode, error.message, attempts);

  return { title, message, isRetryable, hasUnconfirmedUpload };
}

/**
 * Picks the title and message for a status, falling back to the message the API sent.
 */
function describeError(statusCode: number, apiMessage: string, attempts: number) {
  const triedMessage = `We tried ${attempts} ${attempts === 1 ? 'time' : 'times'} and couldn't confirm the upload.`;

  if (statusCode === 0) {
    return { title: 'Connection lost while uploading', message: triedMessage };
  }
  if (statusCode >= FIRST_SERVER_ERROR_STATUS) {
    return { title: 'The server had a problem', message: triedMessage };
  }
  if (statusCode === UNAUTHORIZED_STATUS) {
    return {
      title: 'Your session has expired',
      message: 'Log in again, then migrate your vaults.'
    };
  }
  if (statusCode === CONFLICT_STATUS) {
    return { title: 'Some of this data is already on an account', message: apiMessage };
  }
  if (statusCode === PAYLOAD_TOO_LARGE_STATUS) {
    return { title: 'Your vaults are too large to upload', message: apiMessage };
  }
  return { title: "We couldn't upload your vaults", message: apiMessage };
}
