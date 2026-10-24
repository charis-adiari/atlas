'use client';

import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import {
  useVerifyEmailLink,
  type VerifyEmailLinkStatus
} from '@/hooks/verification/useVerifyEmailLink';
import styles from './VerifyEmailPage.module.css';

const TEXT: Record<VerifyEmailLinkStatus, { title: string; message: string }> = {
  verifying: { title: 'Verifying your email address', message: 'This only takes a moment.' },
  verified: {
    title: 'Your email address is verified',
    message: 'You can go back to Atlas and carry on.'
  },
  failed: {
    title: "We couldn't verify your email address",
    message:
      'This link is invalid, has already been used or has expired. Sign in to Atlas and ask for a new email.'
  }
};

/**
 * Shows the result of opening the verification link from the email: it verifies the address on arrival and then says
 * whether that worked.
 */
export function VerifyEmailPage() {
  const status = useVerifyEmailLink();
  const { title, message } = TEXT[status];

  return (
    <div className={styles.main}>
      <section className={styles.card} aria-live="polite">
        <span className={status === 'failed' ? styles.markFailed : styles.mark}>
          <Icon name={status === 'failed' ? 'alert' : 'check'} size={26} />
        </span>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.text}>{message}</p>
        {status !== 'verifying' && (
          <Link className={styles.link} href="/">
            Go to Atlas
          </Link>
        )}
      </section>
    </div>
  );
}
