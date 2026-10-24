import { RequireSession } from '@/components/account/guard/RequireSession';
import { Header } from '@/components/header/Header';
import styles from '../page.module.css';

/**
 * Renders a placeholder account page. It exists to be a protected route: the server only serves it to a signed-in
 * user, and the client sends the user home if their session ends while they are on it.
 */
export default function AccountPage() {
  return (
    <>
      <Header />
      <main className={styles.main}>
        <RequireSession>
          <p className={styles.placeholder}>Your account (placeholder page).</p>
        </RequireSession>
      </main>
    </>
  );
}
