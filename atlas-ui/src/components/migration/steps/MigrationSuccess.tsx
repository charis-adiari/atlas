import { useId } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { ModalDialog } from '@/components/ui/ModalDialog';
import styles from './MigrationStep.module.css';

interface MigrationSuccessProps {
  vaultCount: number;
  email: string;
  onDone: () => void;
}

/**
 * Confirms that the vaults are on the account, once the API has said so.
 */
export function MigrationSuccess({ vaultCount, email, onDone }: MigrationSuccessProps) {
  const titleId = useId();
  const linked = vaultCount === 1 ? 'Your vault is' : `All ${vaultCount} vaults are`;

  return (
    <ModalDialog labelledById={titleId} onClose={onDone}>
      <div className={styles.centered}>
        <span className={styles.successMark}>
          <Icon name="check" size={28} />
        </span>
        <h2 id={titleId} className={styles.title}>
          Your vaults are backed up
        </h2>
        <p className={styles.subtitle}>
          {linked} now linked to your account. Sign in on any device to pick up where you left off.
        </p>
      </div>
      <Button isFullWidth onClick={onDone}>
        Open my vaults
      </Button>
      <p className={styles.signedInAs}>Signed in as {email}</p>
    </ModalDialog>
  );
}
