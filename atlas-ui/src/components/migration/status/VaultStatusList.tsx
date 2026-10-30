import type { VaultPayload } from '@/types/migration';
import styles from './VaultStatusList.module.css';

export type VaultStatus = 'uploading' | 'uploaded' | 'not-uploaded' | 'not-confirmed';

interface VaultStatusListProps {
  vaults: VaultPayload[];
  status: VaultStatus;
}

const STATUS_LABELS: Record<VaultStatus, string> = {
  uploading: 'Uploading…',
  uploaded: 'Uploaded',
  'not-uploaded': 'Not uploaded',
  'not-confirmed': 'Not confirmed'
};

/**
 * Lists the vaults being migrated with the state they are in. The upload is a single all-or-nothing request, so every
 * vault shares one state.
 */
export function VaultStatusList({ vaults, status }: VaultStatusListProps) {
  return (
    <ul className={styles.list}>
      {vaults.map((vault) => (
        <li key={vault.id} className={styles.row}>
          <span className={styles.marker} aria-hidden="true">
            {status === 'uploading' && <span className={styles.spinner} />}
            {status === 'uploaded' && (
              <span
                className="material-symbols-rounded"
                aria-hidden="true"
                style={{ fontSize: '0.875rem' }}
              >
                check
              </span>
            )}
            {(status === 'not-uploaded' || status === 'not-confirmed') && (
              <span
                className="material-symbols-rounded"
                aria-hidden="true"
                style={{ fontSize: '1.125rem' }}
              >
                remove
              </span>
            )}
          </span>
          <span className={styles.name}>{vault.name}</span>
          <span className={styles.status}>{STATUS_LABELS[status]}</span>
        </li>
      ))}
    </ul>
  );
}
