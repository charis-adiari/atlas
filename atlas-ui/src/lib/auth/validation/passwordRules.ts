export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;
export const PASSWORD_TOO_LONG_MESSAGE = `Password must be at most ${PASSWORD_MAX_LENGTH} characters`;
export const PASSWORD_MISMATCH_MESSAGE = "Passwords don't match";

const UPPERCASE_PATTERN = /[A-Z]/;
const LOWERCASE_PATTERN = /[a-z]/;
const DIGIT_PATTERN = /[0-9]/;
const SPECIAL_PATTERN = /[^A-Za-z0-9]/;

/**
 * Represents one requirement a password has to meet.
 */
export interface PasswordRule {
  id: string;
  label: string;
  isMetBy: (password: string) => boolean;
}

/**
 * Represents whether a password currently meets a requirement.
 */
export interface PasswordRuleResult {
  id: string;
  label: string;
  isMet: boolean;
}

export const PASSWORD_RULES: readonly PasswordRule[] = [
  {
    id: 'min-length',
    label: `At least ${PASSWORD_MIN_LENGTH} characters`,
    isMetBy: (password) => password.length >= PASSWORD_MIN_LENGTH
  },
  {
    id: 'uppercase',
    label: 'One uppercase letter',
    isMetBy: (password) => UPPERCASE_PATTERN.test(password)
  },
  {
    id: 'lowercase',
    label: 'One lowercase letter',
    isMetBy: (password) => LOWERCASE_PATTERN.test(password)
  },
  { id: 'digit', label: 'One digit', isMetBy: (password) => DIGIT_PATTERN.test(password) },
  {
    id: 'special',
    label: 'One special character',
    isMetBy: (password) => SPECIAL_PATTERN.test(password)
  }
];

/**
 * Checks a password against every requirement, in the order they are listed to the user. These are the same rules
 * the API enforces, repeated here only to give feedback while typing.
 */
export function evaluatePasswordRules(password: string): PasswordRuleResult[] {
  return PASSWORD_RULES.map(({ id, label, isMetBy }) => ({
    id,
    label,
    isMet: isMetBy(password)
  }));
}

/**
 * Checks whether a password is longer than the API accepts.
 */
export function isPasswordTooLong(password: string): boolean {
  return password.length > PASSWORD_MAX_LENGTH;
}

/**
 * Checks whether a password meets every requirement and is not too long.
 */
export function isPasswordStrong(password: string): boolean {
  return !isPasswordTooLong(password) && PASSWORD_RULES.every((rule) => rule.isMetBy(password));
}

/**
 * Checks that the password typed a second time is the same as the first. The confirmation is only a guard against typos
 * and is never sent to the API.
 *
 * @returns the message to show next to the confirmation field, or null if the two match
 */
export function validatePasswordConfirmation(
  password: string,
  confirmation: string
): string | null {
  return password === confirmation ? null : PASSWORD_MISMATCH_MESSAGE;
}
