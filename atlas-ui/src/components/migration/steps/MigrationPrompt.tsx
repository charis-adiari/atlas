import { useId } from 'react';
import { Button } from '@/components/Button/Button';
import { ModalDialog } from '@/components/ui/ModalDialog';
import { formatVaultSummary, summarizeVaultData } from '@/lib/migration/local/vaultSummary';
import type { MigrationRequest } from '@/types/migration';
import styles from './MigrationStep.module.css';

interface MigrationPromptProps {
  data: MigrationRequest;
  onConfirm: () => void;
  onDecline: () => void;
}

/**
 * Asks whether to move the vaults found on this device into the new account. Dismissing the dialog counts as declining,
 * which leaves the local data as it is.
 */
export function MigrationPrompt({ data, onConfirm, onDecline }: MigrationPromptProps) {
  const titleId = useId();

  return (
    <ModalDialog labelledById={titleId} onClose={onDecline}>
      <h2 id={titleId} className={styles.title}>
        Move your vaults to your account?
      </h2>
      <p className={styles.subtitle}>
        We found {formatVaultSummary(summarizeVaultData(data))} on this device. Migrate them to open
        your work from any device.
      </p>
      <p className={styles.hint}>
        Your local data stays on this device until the upload is confirmed. If you keep it here
        only, it won&apos;t be linked to your account.
      </p>
      <div className={styles.actions}>
        <Button variant="primary" size="large" className={styles.action} onClick={onConfirm}>
          Migrate my vaults
        </Button>
        <Button variant="outline" size="large" className={styles.action} onClick={onDecline}>
          Keep on this device only
        </Button>
      </div>
    </ModalDialog>
  );
}
