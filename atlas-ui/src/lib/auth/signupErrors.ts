import { ApiError } from '@/lib/api/apiError';
import { NETWORK_ERROR_STATUS } from '@/lib/api/httpClient';

export const ACCOUNT_NOT_CREATED_MESSAGE =
  "We couldn't create an account with these details. If you already have an account, try signing in instead.";
export const INVALID_DETAILS_MESSAGE = 'Please check the highlighted fields and try again.';
export const TOO_MANY_ATTEMPTS_MESSAGE = 'Too many attempts. Please wait a moment and try again.';
export const CONNECTION_PROBLEM_MESSAGE =
  "We couldn't reach the server. Check your connection and try again.";
export const UNEXPECTED_SIGNUP_ERROR_MESSAGE =
  'Something went wrong on our side. Please try again in a moment.';

const BAD_REQUEST_STATUS = 400;
const TOO_MANY_REQUESTS_STATUS = 429;

/**
 * Represents what to tell the user about a failed signup, and whether it was one of the failures we expect. Anything
 * unexpected should be logged, because the user only gets a generic message for it.
 */
export interface SignupErrorDescription {
  message: string;
  isExpected: boolean;
}

/**
 * Represents the per-field messages the API returns for an invalid signup.
 */
export interface SignupFieldErrors {
  email?: string;
  password?: string;
}

/**
 * Turns a failed signup into a friendly message. Failures the user can act on get a specific one; anything else gets
 * a generic message so technical wording never reaches the screen. A refusal without field messages is the API's
 * deliberately vague answer, for example when the email is already registered, so it never says why.
 */
export function describeSignupError(error: unknown): SignupErrorDescription {
  const status = error instanceof ApiError ? error.statusCode : null;

  if (status === BAD_REQUEST_STATUS) {
    return {
      message: hasFieldErrors(error) ? INVALID_DETAILS_MESSAGE : ACCOUNT_NOT_CREATED_MESSAGE,
      isExpected: true
    };
  }
  if (status === TOO_MANY_REQUESTS_STATUS) {
    return { message: TOO_MANY_ATTEMPTS_MESSAGE, isExpected: true };
  }
  if (status === NETWORK_ERROR_STATUS) {
    return { message: CONNECTION_PROBLEM_MESSAGE, isExpected: true };
  }
  return { message: UNEXPECTED_SIGNUP_ERROR_MESSAGE, isExpected: false };
}

/**
 * Tells whether the API attached a message to the email or the password.
 */
function hasFieldErrors(error: unknown): boolean {
  const { email, password } = getSignupFieldErrors(error);
  return email !== undefined || password !== undefined;
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
