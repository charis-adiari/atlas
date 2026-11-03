import { useState } from 'react';
import type { MigrationResult } from '@/components/migration/MigrationFlow';
import { useAuthSession } from '@/hooks/useAuthSession';
import { readUnmigratedVaultData } from '@/lib/migration/local/localVaultData';
import { AuthStatus, type AuthSession } from '@/lib/auth/session/authSessionStore';
import type { SignupResponse } from '@/types/auth';
import type { MigrationRequest } from '@/types/migration';

export const ACCOUNT_CREATED_TITLE = 'Account created';
export const SIGNED_IN_MESSAGE = "You're signed in and ready to go.";
export const KEPT_LOCAL_MESSAGE =
  "Your local vaults stay on this device and aren't linked to your account.";
export const SESSION_EXPIRED_TITLE = 'Session expired';
export const SESSION_EXPIRED_MESSAGE =
  'For your security you were signed out. Please log in again.';

/**
 * Represents a short confirmation shown at the bottom of the screen.
 */
export interface AccountToast {
  title: string;
  message: string;
}

/**
 * Represents everything the account controls need to render and react.
 */
export interface UseAccountFlowResult {
  status: AuthStatus;
  session: AuthSession | null;
  isSignupOpen: boolean;
  verificationEmail: string | null;
  hasLocalVaults: boolean;
  migrationData: MigrationRequest | null;
  toast: AccountToast | null;
  openSignup: () => void;
  closeSignup: () => void;
  dismissToast: () => void;
  handleSignupSuccess: (response: SignupResponse) => void;
  handleVerified: () => void;
  handleUseDifferentEmail: () => void;
  handleMigrationFinish: (result: MigrationResult) => void;
}

/**
 * Sequences what happens around signup: the form, the email verification step, which is what signs the new user in,
 * the offer to migrate local vaults, and the confirmations and notices.
 */
export function useAccountFlow(): UseAccountFlowResult {
  const { status, session, endReason } = useAuthSession();
  const [isSignupOpen, setIsSignupOpen] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  const [hasLocalVaults, setHasLocalVaults] = useState(false);
  const [migrationData, setMigrationData] = useState<MigrationRequest | null>(null);
  const [toast, setToast] = useState<AccountToast | null>(null);
  const [hasDismissedExpiry, setHasDismissedExpiry] = useState(false);

  const isExpiryNoticeVisible =
    status === AuthStatus.anonymous && endReason === 'expired' && !hasDismissedExpiry;

  function continueAfterSignup(): void {
    const localData = readUnmigratedVaultData();
    if (localData === null) {
      setToast({ title: ACCOUNT_CREATED_TITLE, message: SIGNED_IN_MESSAGE });
    } else {
      setMigrationData(localData);
    }
  }

  function handleSignupSuccess(response: SignupResponse): void {
    setIsSignupOpen(false);
    setHasDismissedExpiry(false);
    setHasLocalVaults(readUnmigratedVaultData() !== null);
    setVerificationEmail(response.email);
  }

  function handleUseDifferentEmail(): void {
    setVerificationEmail(null);
    setIsSignupOpen(true);
  }

  return {
    status,
    session,
    isSignupOpen,
    verificationEmail,
    hasLocalVaults,
    migrationData,
    toast: isExpiryNoticeVisible
      ? { title: SESSION_EXPIRED_TITLE, message: SESSION_EXPIRED_MESSAGE }
      : toast,
    openSignup: () => setIsSignupOpen(true),
    closeSignup: () => setIsSignupOpen(false),
    dismissToast: () => {
      setToast(null);
      if (isExpiryNoticeVisible) {
        setHasDismissedExpiry(true);
      }
    },
    handleSignupSuccess,
    handleVerified: () => {
      setVerificationEmail(null);
      continueAfterSignup();
    },
    handleUseDifferentEmail,
    handleMigrationFinish: (result) => {
      setMigrationData(null);
      if (result === 'kept-local') {
        setToast({ title: ACCOUNT_CREATED_TITLE, message: KEPT_LOCAL_MESSAGE });
      }
    }
  };
}
