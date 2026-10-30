import { resendVerification } from '@/lib/api/authApi';
import { refreshSession } from '@/lib/auth/session/sessionService';

/**
 * Represents how email addresses get verified. Anything that can send a verification email and tell whether the link
 * was opened can be plugged in with setEmailVerificationProvider.
 */
export interface EmailVerificationProvider {
  sendVerification: (email: string) => Promise<void>;
  checkVerified: () => Promise<boolean>;
}

/**
 * Provider backed by the API. The API emails the first verification link when the account is created, so this only
 * has to send another one when the user asks. Opening the link signs the user in, and the session cookie it sets is
 * shared by every tab of the browser, so the link counts as opened here once this browser has a session. A link opened
 * on another device is not noticed; the user signs in there instead.
 */
export const API_EMAIL_VERIFICATION: EmailVerificationProvider = {
  sendVerification: (email) => resendVerification(email),
  checkVerified: () => refreshSession()
};

let current: EmailVerificationProvider = API_EMAIL_VERIFICATION;

/**
 * Gets the provider the signup flow uses to verify email addresses.
 */
export function getEmailVerificationProvider(): EmailVerificationProvider {
  return current;
}

/**
 * Replaces the provider that verifies email addresses. Passing null restores the one backed by the API.
 */
export function setEmailVerificationProvider(provider: EmailVerificationProvider | null): void {
  current = provider ?? API_EMAIL_VERIFICATION;
}
