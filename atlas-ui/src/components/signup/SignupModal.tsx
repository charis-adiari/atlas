import { useId } from 'react';
import { Icon } from '@/components/ui/Icon';
import { ModalDialog } from '@/components/ui/ModalDialog';
import type { SignupResponse } from '@/types/auth';
import { SignupForm } from './SignupForm';
import styles from './SignupModal.module.css';

interface SignupModalProps {
  onClose: () => void;
  onSuccess: (response: SignupResponse) => void;
  onLoginClick?: () => void;
}

/**
 * Shows the signup form in a modal dialog. The close button comes last in the DOM so the first field receives focus
 * when the dialog opens.
 */
export function SignupModal({ onClose, onSuccess, onLoginClick }: SignupModalProps) {
  const titleId = useId();

  return (
    <ModalDialog labelledById={titleId} onClose={onClose}>
      <h2 id={titleId} className={styles.title}>
        Create your account
      </h2>
      <p className={styles.subtitle}>Back up your work and open it from any device.</p>
      <SignupForm onSuccess={onSuccess} />
      {onLoginClick && (
        <p className={styles.footer}>
          Already have an account?{' '}
          <button type="button" className={styles.link} onClick={onLoginClick}>
            Log in
          </button>
        </p>
      )}
      <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
        <Icon name="close" />
      </button>
    </ModalDialog>
  );
}
