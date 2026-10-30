import { useId } from 'react';
import { Button } from '@/components/Button/Button';
import { ModalDialog } from '@/components/ui/ModalDialog';
import type { FailureDescription } from '@/lib/migration/migrationFailure';
import type { VaultPayload } from '@/types/migration';
import { VaultStatusList } from '../status/VaultStatusList';
import styles from './MigrationStep.module.css';

interface MigrationFailureProps {
  vaults: VaultPayload[];
  failure: FailureDescription;
  onRetry: () => void;
  onContinue: () => void;
}

/**
 * Explains that the migration did not finish, reassures the user that their local data is untouched, and offers to try
 * again when trying again could help. Dismissing the dialog means continuing without migrating.
 */
export function MigrationFailure({ vaults, failure, onRetry, onContinue }: MigrationFailureProps) {
  const titleId = useId();
  const vaultStatus = failure.hasUnconfirmedUpload ? 'not-confirmed' : 'not-uploaded';
  const safeMessage =
    vaults.length === 1
      ? 'Your vault is still on this device, unchanged.'
      : `All ${vaults.length} vaults are still on this device, unchanged.`;

  return (
    <ModalDialog labelledById={titleId} onClose={onContinue} isWide>
      <h2 id={titleId} className={styles.title}>
        Migration interrupted
      </h2>
      <div className={styles.stack}>
        <div role="alert" className={`${styles.notice} ${styles.warning}`}>
          <span
            className="material-symbols-rounded"
            aria-hidden="true"
            style={{ fontSize: '1.25rem' }}
          >
            warning
          </span>
          <div>
            <p className={styles.noticeTitle}>{failure.title}</p>
            <p className={styles.noticeText}>{failure.message}</p>
          </div>
        </div>
        <VaultStatusList vaults={vaults} status={vaultStatus} />
        <div className={`${styles.notice} ${styles.safe}`}>
          <span
            className="material-symbols-rounded"
            aria-hidden="true"
            style={{ fontSize: '1.25rem' }}
          >
            shield
          </span>
          <div>
            <p className={styles.noticeTitle}>Your local data is safe</p>
            <p className={styles.noticeText}>{safeMessage}</p>
          </div>
        </div>
      </div>
      <div className={styles.actions}>
        {failure.isRetryable && (
          <Button variant="primary" size="large" className={styles.action} onClick={onRetry}>
            Retry migration
          </Button>
        )}
        <Button variant="outline" size="large" className={styles.action} onClick={onContinue}>
          Continue without migrating
        </Button>
      </div>
    </ModalDialog>
  );
}
