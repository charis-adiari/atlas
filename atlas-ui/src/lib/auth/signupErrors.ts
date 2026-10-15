import { ApiError } from '@/lib/api/ApiError';

export const DEFAULT_SIGNUP_ERROR_MESSAGE = "We couldn't create your account with these details.";

/**
 * Represents the per-field messages the API returns for an invalid signup.
 */
export interface SignupFieldErrors {
  email?: string;
  password?: string;
}

/**
 * Gets the message to show for a failed signup: the API's own message when there is one, a generic one otherwise.
 */
export function getSignupErrorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : DEFAULT_SIGNUP_ERROR_MESSAGE;
}

/**
 * Gets the messages the API attached to the email and password fields, if any.
 */
export function getSignupFieldErrors(error: unknown): SignupFieldErrors {
  if (!(error instanceof ApiError)) {
    return {};
  }
  return { email: error.fieldErrors.email, password: error.fieldErrors.password };
}
