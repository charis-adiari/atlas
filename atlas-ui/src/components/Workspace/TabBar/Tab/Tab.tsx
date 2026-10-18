import { FileType } from '@/lib/fileType';
import styles from './Tab.module.css';

/**
 * Props for the {@link Tab} component.
 */
export interface TabProps {
  /** Text shown on the tab. */
  name: string;

  /** Kind of file open in the tab. Determines the icon, with a blank draft icon when omitted. */
  fileType?: FileType;

  /**
   * Whether this is the currently selected tab.
   * @defaultValue `false`
   */
  isActive?: boolean;
}

/**
 * A single tab showing a file icon, the file name and a close icon.
 */
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
