import { Header } from '@/components/header/Header';
import styles from './page.module.css';

/**
 * Renders the home page: the header above the workspace area.
 */
export default function Home() {
  return (
    <>
      <Header />
      <main className={styles.main}>
        <p className={styles.placeholder}>Your workspace will appear here.</p>
      </main>
    </>
  );
}
