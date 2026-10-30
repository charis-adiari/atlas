import { ApiError } from '@/lib/api/apiError';
import { NETWORK_ERROR_STATUS, UNKNOWN_ERROR_MESSAGE } from '@/lib/api/httpClient';
import { isAlreadyMigrated, migrateVaults } from '@/lib/api/migrationApi';
import type { MigrationRequest } from '@/types/migration';

export const MAX_MIGRATION_ATTEMPTS = 3;
export const RETRY_BASE_DELAY_MS = 1000;

const REQUEST_TIMEOUT_STATUS = 408;
const TOO_MANY_REQUESTS_STATUS = 429;
const FIRST_SERVER_ERROR_STATUS = 500;

/**
 * Represents the moment the migration is known to have been stored: the API accepted it, or told us that an earlier
 * attempt that looked like a failure had in fact gone through.
 */
export interface MigrationSuccess {
  status: 'success';
  isRecovered: boolean;
}

/**
 * Represents a migration that could not be confirmed. The local data is untouched either way.
 */
export interface MigrationFailure {
  status: 'failure';
  error: ApiError;
  attempts: number;
  isRetryable: boolean;
  hasUnconfirmedUpload: boolean;
}

export type MigrationOutcome = MigrationSuccess | MigrationFailure;

/**
 * Represents how a run is started and observed.
 */
export interface MigrationRunOptions {
  hasUnconfirmedUpload: boolean;
  onAttempt: (attempt: number) => void;
  wait?: (milliseconds: number) => Promise<void>;
}

/**
 * Uploads the data, trying again with a growing pause after a failure that might pass by itself: the server could not be
 * reached, or it had a problem of its own. Anything the server rejected on purpose is reported straight away.
 *
 * An upload that fails without an answer may still have been stored. When a later attempt is then refused because the
 * data already exists, that is the API confirming the earlier one, so it counts as success. Without such an earlier
 * attempt a conflict is a real failure.
 *
 * @param data the local payload
 * @param options whether an earlier run left an upload unconfirmed, a callback for the attempt number, and the
 * function that pauses between attempts
 */
export async function migrateWithRetry(
  data: MigrationRequest,
  options: MigrationRunOptions
): Promise<MigrationOutcome> {
  const wait = options.wait ?? pause;
  let hasUnconfirmedUpload = options.hasUnconfirmedUpload;
  let attempt = 1;
  options.onAttempt(attempt);

  for (;;) {
    try {
      await migrateVaults(data);
      return { status: 'success', isRecovered: false };
    } catch (caught) {
      const error = toApiError(caught);
      if (isAlreadyMigrated(error) && hasUnconfirmedUpload) {
        return { status: 'success', isRecovered: true };
      }

      hasUnconfirmedUpload = hasUnconfirmedUpload || isOutcomeUnknown(error);
      const isRetryable = isWorthRetrying(error);
      if (!isRetryable || attempt >= MAX_MIGRATION_ATTEMPTS) {
        return { status: 'failure', error, attempts: attempt, isRetryable, hasUnconfirmedUpload };
      }

      attempt += 1;
      options.onAttempt(attempt);
      await wait(RETRY_BASE_DELAY_MS * 2 ** (attempt - 2));
    }
  }
}

/**
 * Treats anything that is not an API error, such as an answer that cannot be read, like a lost connection.
 */
function toApiError(caught: unknown): ApiError {
  return caught instanceof ApiError
    ? caught
    : new ApiError(NETWORK_ERROR_STATUS, UNKNOWN_ERROR_MESSAGE);
}

/**
 * Checks whether a failure leaves it open that the server stored the data: no answer came, or the server broke down
 * while handling the request.
 */
function isOutcomeUnknown(error: ApiError): boolean {
  return error.statusCode === NETWORK_ERROR_STATUS || error.statusCode >= FIRST_SERVER_ERROR_STATUS;
}

/**
 * Checks whether trying again could help: the failure was on the way there or on the server's side, not a rejection of
 * the data or of the user.
 */
function isWorthRetrying(error: ApiError): boolean {
  return (
    isOutcomeUnknown(error) ||
    error.statusCode === REQUEST_TIMEOUT_STATUS ||
    error.statusCode === TOO_MANY_REQUESTS_STATUS
  );
}

/**
 * Waits for the given time.
 */
function pause(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
