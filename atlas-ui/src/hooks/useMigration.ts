import { useRef, useState } from 'react';
import { ApiError } from '@/lib/api/ApiError';
import { getSession } from '@/lib/auth/session/authSessionStore';
import {
  describeMigrationFailure,
  type FailureDescription
} from '@/lib/migration/migrationFailure';
import { MAX_MIGRATION_ATTEMPTS, migrateWithRetry } from '@/lib/migration/migrationRunner';
import { markVaultDataMigrated } from '@/lib/migration/local/localVaultData';
import type { MigrationRequest } from '@/types/migration';

const UNAUTHORIZED_STATUS = 401;
const SESSION_MISSING_MESSAGE = 'There is no signed-in account to migrate to.';

export type MigrationPhase = 'prompt' | 'migrating' | 'failed' | 'succeeded';

/**
 * Represents where the migration is and what the user can do about it.
 */
export interface UseMigrationResult {
  phase: MigrationPhase;
  attempt: number;
  maxAttempts: number;
  failure: FailureDescription | null;
  start: () => Promise<void>;
}

/**
 * Drives the migration of local data into the signed-in account. Starting it again after a failure is how the user
 * retries. The data is only flagged as migrated once the API has confirmed it; until then it stays as it was, so a
 * failure always leaves the local copy to fall back on.
 *
 * @param data the local payload to upload
 */
export function useMigration(data: MigrationRequest): UseMigrationResult {
  const [phase, setPhase] = useState<MigrationPhase>('prompt');
  const [attempt, setAttempt] = useState(1);
  const [failure, setFailure] = useState<FailureDescription | null>(null);
  const hasUnconfirmedUploadRef = useRef(false);
  const isRunningRef = useRef(false);

  async function start(): Promise<void> {
    if (isRunningRef.current) {
      return;
    }
    const session = getSession();
    if (session === null) {
      showFailure(missingSessionFailure());
      return;
    }

    isRunningRef.current = true;
    setFailure(null);
    setPhase('migrating');
    const outcome = await migrateWithRetry(data, session, {
      hasUnconfirmedUpload: hasUnconfirmedUploadRef.current,
      onAttempt: setAttempt
    });
    isRunningRef.current = false;

    if (outcome.status === 'success') {
      markVaultDataMigrated(session.user.id, data);
      setPhase('succeeded');
      return;
    }
    hasUnconfirmedUploadRef.current = outcome.hasUnconfirmedUpload;
    showFailure(describeMigrationFailure(outcome));
  }

  function showFailure(description: FailureDescription): void {
    setFailure(description);
    setPhase('failed');
  }

  return { phase, attempt, maxAttempts: MAX_MIGRATION_ATTEMPTS, failure, start };
}

/**
 * Describes the failure for a migration started without a signed-in session.
 */
function missingSessionFailure(): FailureDescription {
  const error = new ApiError(UNAUTHORIZED_STATUS, SESSION_MISSING_MESSAGE);
  return describeMigrationFailure({
    status: 'failure',
    error,
    attempts: 0,
    isRetryable: false,
    hasUnconfirmedUpload: false
  });
}
