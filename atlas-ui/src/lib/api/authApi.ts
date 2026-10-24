import type {
  LoginRequest,
  LoginResponse,
  SessionInfo,
  SignupRequest,
  SignupResponse
} from '@/types/auth';
import { ApiError } from './ApiError';
import { UNKNOWN_ERROR_MESSAGE, httpClient } from './httpClient';

const SIGNUP_PATH = '/auth/signup';
const LOGIN_PATH = '/auth/login';
const LOGOUT_PATH = '/auth/logout';
const SESSION_PATH = '/auth/session';
const VERIFY_EMAIL_PATH = '/auth/verify-email';
const RESEND_VERIFICATION_PATH = '/auth/resend-verification';
const VERIFICATION_STATUS_PATH = '/auth/verification-status';
const UNAUTHORIZED_STATUS = 401;

/**
 * Creates an account and starts a session for it. The server stores the access token in an HttpOnly cookie.
 *
 * @param request email and password of the new account
 * @throws ApiError if the account could not be created
 */
export async function signup(request: SignupRequest): Promise<SignupResponse> {
  const response = await httpClient.post<unknown>(SIGNUP_PATH, request, {
    canExpireSession: false
  });
  return readSessionResponse(response.data, response.status);
}

/**
 * Starts a session for an existing account.
 *
 * @param request email and password of the account
 * @throws ApiError if the credentials were refused or the request failed
 */
export async function login(request: LoginRequest): Promise<LoginResponse> {
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
 * Verifies an email address with the token from the emailed link. It needs no session, because the link may be opened
 * on another device.
 *
 * @param token the token taken from the verification link
 * @throws ApiError if the token is unknown, already used or expired, or the request failed
 */
export async function verifyEmail(token: string): Promise<void> {
  await httpClient.post(VERIFY_EMAIL_PATH, { token }, { canExpireSession: false });
}

/**
 * Asks the API to email the signed-in user a new verification link. The earlier link stops working.
 *
 * @throws ApiError if the request failed
 */
export async function resendVerification(): Promise<void> {
  await httpClient.post(RESEND_VERIFICATION_PATH);
}

/**
 * Asks the API whether the signed-in user has verified their email address.
 *
 * @returns true once the emailed link has been opened
 * @throws ApiError if the request failed or the answer was not understood
 */
export async function fetchVerificationStatus(): Promise<boolean> {
  const response = await httpClient.get<unknown>(VERIFICATION_STATUS_PATH);
  const candidate = response.data as { isVerified?: unknown } | null;

  if (typeof candidate?.isVerified === 'boolean') {
    return candidate.isVerified;
  }
  throw new ApiError(response.status, UNKNOWN_ERROR_MESSAGE);
}

/**
 * Checks that the body of a signup or login response has the user and the lifetime.
 */
function readSessionResponse(data: unknown, status: number): SignupResponse {
  const candidate = data as Partial<SignupResponse> | null;

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
function isUser(value: unknown): value is SignupResponse['user'] {
  const candidate = value as Partial<SignupResponse['user']> | null | undefined;
  return typeof candidate?.id === 'string' && typeof candidate.email === 'string';
}
