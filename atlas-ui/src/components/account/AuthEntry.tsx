'use client';

import { Toast } from '@/components/feedback/Toast';
import { MigrationFlow } from '@/components/migration/MigrationFlow';
import { SignupModal } from '@/components/signup/SignupModal';
import { Button } from '@/components/ui/Button';
import { CheckInboxDialog } from '@/components/verification/CheckInboxDialog';
import { useAccountFlow } from '@/hooks/useAccountFlow';
import styles from './AuthEntry.module.css';
import { AccountChip } from './session/AccountChip';
import { LogoutButton } from './session/LogoutButton';

/**
 * Shows the sign-up button to anonymous users, and their account badge with a log-out button once signed in. A
 * successful signup closes the form and goes on to email verification when it is required, then to the offer to
 * migrate local vaults, and finally to a confirmation. A session that ends by itself is announced with a notice.
 */
export function AuthEntry() {
  const flow = useAccountFlow();

  return (
    <>
      {flow.status === 'authenticated' && flow.session !== null && (
        <div className={styles.controls}>
          <AccountChip email={flow.session.user.email} />
          <LogoutButton />
        </div>
      )}
      {flow.status === 'anonymous' && <Button onClick={flow.openSignup}>Sign up</Button>}
      {flow.isSignupOpen && (
        <SignupModal onClose={flow.closeSignup} onSuccess={flow.handleSignupSuccess} />
      )}
      {flow.verificationEmail !== null && (
        <CheckInboxDialog
          email={flow.verificationEmail}
          hasLocalVaults={flow.hasLocalVaults}
          onVerified={flow.handleVerified}
          onUseDifferentEmail={flow.handleUseDifferentEmail}
        />
      )}
      {flow.migrationData !== null && (
        <MigrationFlow data={flow.migrationData} onFinish={flow.handleMigrationFinish} />
      )}
      {flow.toast !== null && (
        <Toast
          title={flow.toast.title}
          message={flow.toast.message}
          onDismiss={flow.dismissToast}
        />
      )}
    </>
  );
}
