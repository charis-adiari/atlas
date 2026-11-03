import type {
  LoginRequest,
  SessionInfo,
  SessionStart,
  SignupRequest,
  SignupResponse
} from '@/types/auth';
import { ApiError } from './apiError';
import { UNKNOWN_ERROR_MESSAGE, httpClient } from './httpClient';

export const EMAIL_NOT_VERIFIED_MESSAGE = 'Verify your email address before signing in.';

const SIGNUP_PATH = '/auth/signup';
const LOGIN_PATH = '/auth/login';
const LOGOUT_PATH = '/auth/logout';
const SESSION_PATH = '/auth/session';
const VERIFY_EMAIL_PATH = '/auth/verify-email';
const RESEND_VERIFICATION_PATH = '/auth/resend-verification';
const UNAUTHORIZED_STATUS = 401;
const BAD_REQUEST_STATUS = 400;
const VERIFICATION_REQUIRED = 'verification_required';

/**
 * Creates an account and emails it a verification link. No session starts: the user is signed in once they open the
 * link.
 *
 * @param request email and password of the new account
 * @returns the address the link was sent to
 * @throws ApiError if the account could not be created
 */
export async function signup(request: SignupRequest): Promise<SignupResponse> {
  const response = await httpClient.post<unknown>(SIGNUP_PATH, request, {
    canExpireSession: false
  });
  const candidate = response.data as Partial<SignupResponse> | null;

  if (candidate?.status === VERIFICATION_REQUIRED && typeof candidate.email === 'string') {
    return { status: VERIFICATION_REQUIRED, email: candidate.email };
  }
  throw new ApiError(response.status, UNKNOWN_ERROR_MESSAGE);
}

/**
 * Starts a session for an existing account. The server stores the access token in an HttpOnly cookie.
 *
 * @param request email and password of the account
 * @throws ApiError if the credentials were refused or the request failed; see {@link isEmailNotVerified} for an
 *         account whose address is not verified yet
 */
export async function login(request: LoginRequest): Promise<SessionStart> {
  const response = await httpClient.post<unknown>(LOGIN_PATH, request, {
    canExpireSession: false
  });
  return readSessionResponse(response.data, response.status);
}

/**
 * Ends the session on the server, which clears the cookie.
 *
 * @throws ApiError if the request failed
 */
export async function logout(): Promise<void> {
  await httpClient.post(LOGOUT_PATH, undefined, { canExpireSession: false });
}

/**
 * Asks the server whether there is a valid session, which is how the page learns about one after a reload.
 *
 * @returns the session, or null if the user is anonymous or the session has expired
 * @throws ApiError if the request failed for any reason other than there being no session
 */
export async function fetchSession(): Promise<SessionInfo | null> {
  try {
    const response = await httpClient.get<unknown>(SESSION_PATH, { canExpireSession: false });
    return readSessionInfo(response.data, response.status);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === UNAUTHORIZED_STATUS) {
      return null;
    }
    throw error;
  }
}

/**
 * Verifies an email address with the token from the emailed link and starts a session for its owner. It needs no
 * session beforehand, because the link may be opened on another device.
 *
 * @param token the token taken from the verification link
 * @throws ApiError if the token is unknown, already used or expired, or the request failed
 */
export async function verifyEmail(token: string): Promise<SessionStart> {
  const response = await httpClient.post<unknown>(
    VERIFY_EMAIL_PATH,
    { token },
    { canExpireSession: false }
  );
  return readSessionResponse(response.data, response.status);
}

/**
 * Asks the API to email a new verification link to the address. The earlier link stops working. The answer is the
 * same whether or not the address belongs to an unverified account, so nothing is learned from it.
 *
 * @param email the address to send the link to
 * @throws ApiError if the request failed, for example with 429 after too many requests
 */
export async function resendVerification(email: string): Promise<void> {
  await httpClient.post(RESEND_VERIFICATION_PATH, { email }, { canExpireSession: false });
}

/**
 * Tells whether a failed login was refused only because the account's address is not verified yet, in which case the
 * password was right. The API answers that with a 400 whose detail is this exact message.
 */
export function isEmailNotVerified(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.statusCode === BAD_REQUEST_STATUS &&
    error.message === EMAIL_NOT_VERIFIED_MESSAGE
  );
}

/**
 * Checks that the body of a login or verification response has the user and the lifetime.
 */
function readSessionResponse(data: unknown, status: number): SessionStart {
  const candidate = data as Partial<SessionStart> | null;

  if (isUser(candidate?.user) && typeof candidate.expiresIn === 'number') {
    return { user: candidate.user, expiresIn: candidate.expiresIn };
  }
  throw new ApiError(status, UNKNOWN_ERROR_MESSAGE);
}

/**
 * Checks that the body of a session response has the user and the expiry.
 */
function readSessionInfo(data: unknown, status: number): SessionInfo {
  const candidate = data as Partial<SessionInfo> | null;

  if (isUser(candidate?.user) && typeof candidate.expiresAt === 'number') {
    return { user: candidate.user, expiresAt: candidate.expiresAt };
  }
  throw new ApiError(status, UNKNOWN_ERROR_MESSAGE);
}

/**
 * Checks that a value looks like an account.
 */
function isUser(value: unknown): value is SessionStart['user'] {
  const candidate = value as Partial<SessionStart['user']> | null | undefined;
  return typeof candidate?.id === 'string' && typeof candidate.email === 'string';
}
