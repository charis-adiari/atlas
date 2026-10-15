'use client';

import { useState } from 'react';
import { Toast } from '@/components/feedback/Toast';
import { MigrationFlow, type MigrationResult } from '@/components/migration/MigrationFlow';
import { SignupModal } from '@/components/signup/SignupModal';
import { Button } from '@/components/ui/Button';
import { useAuthSession } from '@/hooks/useAuthSession';
import { readUnmigratedVaultData } from '@/lib/migration/local/localVaultData';
import type { MigrationRequest } from '@/types/migration';
import { AccountChip } from './AccountChip';

const WELCOME_TITLE = 'Account created';
const SIGNED_IN_MESSAGE = "You're signed in and ready to go.";
const KEPT_LOCAL_MESSAGE =
  "Your local vaults stay on this device and aren't linked to your account.";

/**
 * Shows the sign-up button to anonymous users and their account badge once signed in. A successful signup closes the
 * form and then either confirms with a toast or, when there are vaults on this device, offers to migrate them first.
 */
export function AuthEntry() {
  const { session } = useAuthSession();
  const [isSignupOpen, setIsSignupOpen] = useState(false);
  const [migrationData, setMigrationData] = useState<MigrationRequest | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  function handleSignupSuccess(): void {
    setIsSignupOpen(false);
    const localData = readUnmigratedVaultData();

    if (localData === null) {
      setToastMessage(SIGNED_IN_MESSAGE);
    } else {
      setMigrationData(localData);
    }
  }

  function handleMigrationFinish(result: MigrationResult): void {
    setMigrationData(null);
    if (result === 'kept-local') {
      setToastMessage(KEPT_LOCAL_MESSAGE);
    }
  }

  return (
    <>
      {session === null ? (
        <Button onClick={() => setIsSignupOpen(true)}>Sign up</Button>
      ) : (
        <AccountChip email={session.user.email} />
      )}
      {isSignupOpen && (
        <SignupModal onClose={() => setIsSignupOpen(false)} onSuccess={handleSignupSuccess} />
      )}
      {migrationData !== null && (
        <MigrationFlow data={migrationData} onFinish={handleMigrationFinish} />
      )}
      {toastMessage !== null && (
        <Toast
          title={WELCOME_TITLE}
          message={toastMessage}
          onDismiss={() => setToastMessage(null)}
        />
      )}
    </>
  );
}
