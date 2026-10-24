import { fetchVerificationStatus, resendVerification } from '@/lib/api/authApi';

/**
 * Represents how email addresses get verified. Anything that can send a verification email and tell whether the link
 * was opened can be plugged in with setEmailVerificationProvider.
 */
export interface EmailVerificationProvider {
  isRequired: boolean;
  sendVerification: (email: string) => Promise<void>;
  checkVerified: () => Promise<boolean>;
}

/**
 * Provider that does not require verification: it reports every address as verified, so signup carries on without a
 * check. Useful for tests and for setups where the API does not verify addresses.
 */
export const NO_EMAIL_VERIFICATION: EmailVerificationProvider = {
  isRequired: false,
  sendVerification: () => Promise.resolve(),
  checkVerified: () => Promise.resolve(true)
};

/**
 * Provider backed by the API. The API emails the first verification link when the account is created, so this only
 * has to send another one when the user asks. The email address is not passed on, because the API uses the account of
 * the signed-in user.
 */
export const API_EMAIL_VERIFICATION: EmailVerificationProvider = {
  isRequired: true,
  sendVerification: () => resendVerification(),
  checkVerified: () => fetchVerificationStatus()
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
