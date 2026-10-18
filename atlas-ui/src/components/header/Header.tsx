import { Button } from '../Button/Button';
import styles from './Header.module.css';

export const Header = () => {
  return (
    <header className={styles.header}>
      <div className={styles.headerStart}>
        <div className={"input-container " + styles.search}>
          <span className="material-symbols-rounded">search</span>
          <input type="text" placeholder="Search this vault..." />
        </div>
      </div>

      <div className={styles.headerEnd}>
        <div className={styles.undoRedo}>
          <Button startIcon="undo" className={styles.headerBtn} aria-label="Undo" />
          <Button startIcon="redo" className={styles.headerBtn} aria-label="Redo" />
        </div>

        <Button startIcon="settings" className={styles.settingsBtn} aria-label="Settings" />

        <div className={styles.statusIndicator}>
          <span className={styles.statusIcon}></span>
          <span>All changes saved</span>
        </div>
        <Button variant='primary' children="Log in" />
      </div>
    </header>
  );
};
