import { useEffect, useEffectEvent, useId } from 'react';
import { Button } from '@/components/Button/Button';
import { ModalDialog } from '@/components/ui/ModalDialog';
import { useResendCountdown } from '@/hooks/verification/useResendCountdown';
import { getEmailVerificationProvider } from '@/lib/auth/verification/emailVerification';
import { logUnexpectedError } from '@/lib/logging/logger';
import styles from './CheckInboxDialog.module.css';

interface CheckInboxDialogProps {
  email: string;
  hasLocalVaults: boolean;
  onVerified: () => void;
  onUseDifferentEmail: () => void;
}

const POLL_INTERVAL_MS = 3000;

/**
 * Tells the user to open the verification link that was emailed to them and waits for it to be opened, which signs them
 * in; a link opened in another tab of this browser is noticed here too. They can ask for
 * another email once the countdown is over, or go back and use a different address. The dialog cannot be dismissed
 * otherwise, so the flow does not carry on before the address is verified.
 */
export function CheckInboxDialog({
  email,
  hasLocalVaults,
  onVerified,
  onUseDifferentEmail
}: CheckInboxDialogProps) {
  const titleId = useId();
  const countdown = useResendCountdown();
  // Noticing the link signs the user in, which re-renders the parent with a new callback. Reading it through an effect
  // event keeps the check that noticed it from being cancelled by that re-render.
  const notifyVerified = useEffectEvent(onVerified);

  useEffect(() => {
    let isCancelled = false;
    const timer = setInterval(async () => {
      try {
        const isVerified = await getEmailVerificationProvider().checkVerified();
        if (isVerified && !isCancelled) {
          notifyVerified();
        }
      } catch (error) {
        logUnexpectedError('verification', error);
      }
    }, POLL_INTERVAL_MS);

    return () => {
      isCancelled = true;
      clearInterval(timer);
    };
  }, []);

  async function resend(): Promise<void> {
    countdown.restart();
    try {
      await getEmailVerificationProvider().sendVerification(email);
    } catch (error) {
      logUnexpectedError('verification', error);
    }
  }

  return (
    <ModalDialog labelledById={titleId}>
      <div className={styles.centered}>
        <span className={styles.mark}>
          <span
            className="material-symbols-rounded"
            aria-hidden="true"
            style={{ fontSize: '1.625rem' }}
          >
            mail
          </span>
        </span>
        <h2 id={titleId} className={styles.title}>
          Check your inbox
        </h2>
        <p className={styles.text}>
          We sent a verification link to <strong>{email}</strong>. Open it to finish creating your
          account and sign in.
        </p>
      </div>
      <Button
        variant="outline"
        size="large"
        className={styles.action}
        disabled={!countdown.canResend}
        onClick={resend}
      >
        {countdown.canResend ? 'Resend email' : `Resend email in ${countdown.label}`}
      </Button>
      <button type="button" className={styles.link} onClick={onUseDifferentEmail}>
        Use a different email
      </button>
      {hasLocalVaults && (
        <p className={styles.note}>
          Your local vaults haven&apos;t been touched. Once you&apos;re verified, we&apos;ll ask
          whether to move them to your account.
        </p>
      )}
    </ModalDialog>
  );
}
