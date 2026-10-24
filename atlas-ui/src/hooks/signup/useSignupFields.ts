import { useState, type ChangeEvent } from 'react';
import type { SignupFieldErrors } from '@/lib/auth/signupErrors';
import { validateEmail } from '@/lib/auth/validation/emailRules';
import {
  PASSWORD_TOO_LONG_MESSAGE,
  evaluatePasswordRules,
  isPasswordStrong,
  isPasswordTooLong,
  validatePasswordConfirmation,
  type PasswordRuleResult
} from '@/lib/auth/validation/passwordRules';

/**
 * Represents the values of the signup fields, the feedback to show next to them, and how to change them.
 */
export interface SignupFields {
  email: string;
  password: string;
  confirmPassword: string;
  emailError: string | null;
  passwordError: string | null;
  confirmPasswordError: string | null;
  passwordRules: PasswordRuleResult[];
  isValid: boolean;
  changeEmail: (event: ChangeEvent<HTMLInputElement>) => void;
  changePassword: (event: ChangeEvent<HTMLInputElement>) => void;
  changeConfirmPassword: (event: ChangeEvent<HTMLInputElement>) => void;
  blurEmail: () => void;
  blurConfirmPassword: () => void;
  showServerErrors: (errors: SignupFieldErrors) => void;
  clearServerErrors: () => void;
}

/**
 * Holds the signup fields and checks them as the user types. The checks only give feedback; the API makes the real
 * decision, and the messages it sends for a field are shown until that field is edited. A mismatch between the
 * password and its confirmation is reported once the confirmation is as long as the password or has been left, so
 * it does not nag while the user is still typing.
 */
export function useSignupFields(): SignupFields {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [hasEmailBeenBlurred, setHasEmailBeenBlurred] = useState(false);
  const [hasConfirmPasswordBeenBlurred, setHasConfirmPasswordBeenBlurred] = useState(false);
  const [serverErrors, setServerErrors] = useState<SignupFieldErrors>({});

  const localEmailError = validateEmail(email);
  const mismatchError = validatePasswordConfirmation(password, confirmPassword);
  const isMismatchReported =
    confirmPassword !== '' &&
    (hasConfirmPasswordBeenBlurred || confirmPassword.length >= password.length);

  return {
    email,
    password,
    confirmPassword,
    emailError: serverErrors.email ?? (hasEmailBeenBlurred ? localEmailError : null),
    passwordError: isPasswordTooLong(password)
      ? PASSWORD_TOO_LONG_MESSAGE
      : (serverErrors.password ?? null),
    confirmPasswordError: isMismatchReported ? mismatchError : null,
    passwordRules: evaluatePasswordRules(password),
    isValid: localEmailError === null && isPasswordStrong(password) && mismatchError === null,
    changeEmail: (event) => {
      setEmail(event.target.value);
      setServerErrors((current) => ({ ...current, email: undefined }));
    },
    changePassword: (event) => {
      setPassword(event.target.value);
      setServerErrors((current) => ({ ...current, password: undefined }));
    },
    changeConfirmPassword: (event) => setConfirmPassword(event.target.value),
    blurEmail: () => setHasEmailBeenBlurred(true),
    blurConfirmPassword: () => setHasConfirmPasswordBeenBlurred(true),
    showServerErrors: setServerErrors,
    clearServerErrors: () => setServerErrors({})
  };
}
