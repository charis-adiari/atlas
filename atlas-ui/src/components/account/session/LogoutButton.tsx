import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { signOut } from '@/lib/auth/session/sessionService';
import { logUnexpectedError } from '@/lib/logging/logger';
import styles from './LogoutButton.module.css';

const FAILURE_MESSAGE = "We couldn't log you out. Check your connection and try again.";

/**
 * Logs the user out and returns them to the home page. If the server cannot be reached the user stays signed in, because
 * their session cookie would still be valid, and is told so.
 */
export function LogoutButton() {
  const router = useRouter();
  const [hasFailed, setHasFailed] = useState(false);

  async function logOut(): Promise<void> {
    setHasFailed(false);
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      logUnexpectedError('logout', error);
      setHasFailed(true);
    }
  }

  return (
    <>
      <Button variant="secondary" onClick={logOut}>
        Log out
      </Button>
      {hasFailed && (
        <p role="alert" className={styles.error}>
          {FAILURE_MESSAGE}
        </p>
      )}
    </>
  );
}
