import type { MigrationRequest } from '@/types/migration';
import { ApiError } from './apiError';
import { httpClient } from './httpClient';

export const MIGRATION_TIMEOUT_MS = 60_000;

/**
 * The wording the API uses when it refuses an upload because some of its data is already stored. The API answers
 * this with a plain bad request, so the wording is the only way to tell it apart from other refusals.
 */
export const ALREADY_MIGRATED_MESSAGE =
  'The data could not be saved. Some of it may already have been migrated.';

const MIGRATE_PATH = '/vaults/migrate';
const BAD_REQUEST_STATUS = 400;

/**
 * Uploads the whole local payload to the signed-in user's account. The API stores all of it or none of it. The
 * session cookie identifies the account, so no credentials are passed here. The API answers success with an empty body.
 *
 * @param request the local vaults, folders, files and backlinks
 * @throws ApiError if the upload was rejected or could not be completed
 */
export async function migrateVaults(request: MigrationRequest): Promise<void> {
  await httpClient.post(MIGRATE_PATH, request, { timeout: MIGRATION_TIMEOUT_MS });
}

/**
 * Tells whether the API refused an upload because some of its data is already stored, which normally means an earlier
 * upload went through.
 */
export function isAlreadyMigrated(error: ApiError): boolean {
  return error.statusCode === BAD_REQUEST_STATUS && error.message === ALREADY_MIGRATED_MESSAGE;
}
