import { useAuthSession } from '@/hooks/useAuthSession';
import { useMigration } from '@/hooks/useMigration';
import type { MigrationRequest } from '@/types/migration';
import { MigrationFailure } from './steps/MigrationFailure';
import { MigrationProgress } from './steps/MigrationProgress';
import { MigrationPrompt } from './steps/MigrationPrompt';
import { MigrationSuccess } from './steps/MigrationSuccess';

export type MigrationResult = 'migrated' | 'kept-local';

interface MigrationFlowProps {
  data: MigrationRequest;
  onFinish: (result: MigrationResult) => void;
}

/**
 * Walks the user through migrating their local vaults: the prompt, then progress, then either the confirmation or a
 * failure they can retry or walk away from. It reports how it ended, so the caller knows whether the data stayed local.
 */
export function MigrationFlow({ data, onFinish }: MigrationFlowProps) {
  const migration = useMigration(data);
  const { session } = useAuthSession();
  const keepLocal = () => onFinish('kept-local');

  if (migration.phase === 'migrating') {
    return (
      <MigrationProgress
        vaults={data.vaults}
        attempt={migration.attempt}
        maxAttempts={migration.maxAttempts}
      />
    );
  }
  if (migration.phase === 'succeeded') {
    return (
      <MigrationSuccess
        vaultCount={data.vaults.length}
        email={session?.user.email ?? ''}
        onDone={() => onFinish('migrated')}
      />
    );
  }
  if (migration.phase === 'failed' && migration.failure !== null) {
    return (
      <MigrationFailure
        vaults={data.vaults}
        failure={migration.failure}
        onRetry={migration.start}
        onContinue={keepLocal}
      />
    );
  }
  return <MigrationPrompt data={data} onConfirm={migration.start} onDecline={keepLocal} />;
}
