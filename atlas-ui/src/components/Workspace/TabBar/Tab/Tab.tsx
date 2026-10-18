import { FileType } from '@/lib/fileType';
import styles from './Tab.module.css';

export interface TabProps {
  name: string;
  fileType?: FileType;
  isActive?: boolean;
}

export const Tab = ({ name, fileType, isActive = false }: TabProps) => {
  return (
    <span className={isActive ? styles.tab + ' ' + styles.active : styles.tab}>
      <span className="material-symbols-rounded">
        {!fileType ? 'draft' : fileType == FileType.canvas ? 'grid_on' :  'notes' }
      </span>
      <span className={styles.text}>{name}</span>
      <span className="material-symbols-rounded">close</span>
    </span>
  );
};
