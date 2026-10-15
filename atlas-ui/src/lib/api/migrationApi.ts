import type { AuthSession } from '@/lib/auth/session/authSessionStore';
import type { MigrationRequest, MigrationResponse } from '@/types/migration';
import { postJson } from './apiClient';

export const MIGRATION_TIMEOUT_MS = 60_000;

const MIGRATE_PATH = '/vaults/migrate';

/**
 * Uploads the whole local payload to the signed-in user's account. The API stores all of it or none of it.
 *
 * @param request the local vaults, folders, files and backlinks
 * @param credentials the access token of the signed-in user
 * @returns how many records of each kind were stored
 * @throws ApiError if the upload was rejected or could not be completed
 */
export function migrateVaults(
  request: MigrationRequest,
  credentials: Pick<AuthSession, 'accessToken' | 'tokenType'>
): Promise<MigrationResponse> {
  return postJson<MigrationResponse>(MIGRATE_PATH, request, {
    authorization: `${credentials.tokenType} ${credentials.accessToken}`,
    timeoutMs: MIGRATION_TIMEOUT_MS
  });
}
