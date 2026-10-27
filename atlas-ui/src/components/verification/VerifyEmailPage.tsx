'use client';

import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import {
  useVerifyEmailLink,
  type VerifyEmailLinkStatus
} from '@/hooks/verification/useVerifyEmailLink';
import { ResendVerificationForm } from './ResendVerificationForm';
import styles from './VerifyEmailPage.module.css';

const TEXT: Record<VerifyEmailLinkStatus, { title: string; message: string }> = {
  verifying: { title: 'Verifying your email address', message: 'This only takes a moment.' },
  verified: {
    title: 'Your email address is verified',
    message: "You're signed in. You can go back to Atlas and carry on."
  },
  failed: {
    title: "We couldn't verify your email address",
    message:
      'This link is invalid, has already been used or has expired. Enter your email address to get a new one.'
  }
};

/**
 * Shows the result of opening the verification link from the email: it verifies the address on arrival, which signs
 * the user in, and then says whether that worked. When it did not, the user can ask for a new link.
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
        {status === 'failed' && <ResendVerificationForm />}
        {status !== 'verifying' && (
          <Link className={styles.link} href="/">
            Go to Atlas
          </Link>
        )}
      </section>
    </div>
  );
}
