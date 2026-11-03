import { useId } from 'react';
import { ModalDialog } from '@/components/ui/ModalDialog';
import { pluralize } from '@/lib/migration/local/vaultSummary';
import type { VaultPayload } from '@/types/migration';
import { VaultStatusList } from '../status/VaultStatusList';
import styles from './MigrationStep.module.css';

interface MigrationProgressProps {
  vaults: VaultPayload[];
  attempt: number;
  maxAttempts: number;
}

/**
 * Shows that the upload is under way. The dialog cannot be dismissed while it runs. The bar is indeterminate on
 * purpose: the upload is one request that reports no partial progress, so the label says what is happening instead.
 */
export function MigrationProgress({ vaults, attempt, maxAttempts }: MigrationProgressProps) {
  const titleId = useId();
  const label =
    attempt === 1
      ? `Uploading ${pluralize(vaults.length, 'vault', 'vaults')}…`
      : `Connection problem. Retrying (attempt ${attempt} of ${maxAttempts})…`;

  return (
    <ModalDialog labelledById={titleId} isWide>
      <h2 id={titleId} className={styles.title}>
        Migrating your vaults…
      </h2>
      <p className={styles.subtitle}>
        Keep this window open. Your local data stays on this device until everything has uploaded.
      </p>
      <p className={styles.progressHeader} role="status">
        {label}
      </p>
      <div className={styles.track} role="progressbar" aria-label="Migration progress">
        <div className={styles.bar} />
      </div>
      <VaultStatusList vaults={vaults} status="uploading" />
    </ModalDialog>
  );
}
