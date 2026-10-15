import { AuthEntry } from '@/components/account/AuthEntry';
import styles from './Header.module.css';

/**
 * Renders the top bar with the Atlas brand and the account controls.
 */
export function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <span className={styles.logo} aria-hidden="true" />
        <span className={styles.name}>Atlas</span>
      </div>
      <AuthEntry />
    </header>
  );
}
