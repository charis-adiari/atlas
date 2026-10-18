import { Button } from '@/components/Button/Button';
import Image from 'next/image';
import { TabBar } from './TabBar/TabBar';
import styles from './Workspace.module.css';

/** Main content area */
export const Workspace = ({ vaultId }: { vaultId?: string }) => {
  return (
    <div className={styles.workspace}>
      <TabBar />

      <div className={styles.content}>
        <div className={styles.empty}>
          <Image
            src="/empty-state.png"
            alt="Empty workspace"
            className={styles.emptyImage}
            width={500}
            height={300}
          />
          <span className={styles.emptyText}>
            <span className={styles.emptyHeading}>This vault is empty</span>
            Create your first note or canvas to start organising your ideas
          </span>
          <div className={styles.buttonRow}>
            <Button variant='primary' size='large' startIcon='notes'>New Note</Button>
            <Button variant='outline' size='large' startIcon='grid_on' iconColour='secondary'>New Canvas</Button>
          </div>
        </div>
      </div>
    </div>
  );
};
