import Image from 'next/image';
import { Button } from '../Button/Button';
import { TabBar } from './TabBar/TabBar';
import styles from './Workspace.module.css';

export const Workspace = ({ vaultId }: { vaultId?: string }) => {
  return (
    <>
      <TabBar />

      <div className={styles.workspace}>
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
            <Button variant='primary-large' startIcon='notes' children='New Note' />
            <Button variant='outline-large' startIcon='grid_on' iconColour='accent' children='New Canvas' />
          </div>
        </div>
      </div>
    </>
  );
};
