export const EMAIL_MAX_LENGTH = 320;
export const EMAIL_REQUIRED_MESSAGE = 'Email is required';
export const EMAIL_TOO_LONG_MESSAGE = 'Email is too long';
export const EMAIL_INVALID_MESSAGE = 'Enter a valid email address';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+$/;

/**
 * Trims and lower-cases an email address, the form the API stores it in.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Checks an email address as typed. It is deliberately lenient, because the API makes the final decision.
 *
 * @returns the message to show next to the field, or null if the address looks valid
 */
export function validateEmail(email: string): string | null {
  const normalized = normalizeEmail(email);

  if (normalized === '') {
    return EMAIL_REQUIRED_MESSAGE;
  }
  if (normalized.length > EMAIL_MAX_LENGTH) {
    return EMAIL_TOO_LONG_MESSAGE;
  }
  if (!EMAIL_PATTERN.test(normalized)) {
    return EMAIL_INVALID_MESSAGE;
  }
  return null;
}
