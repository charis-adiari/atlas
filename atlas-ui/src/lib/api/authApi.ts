import type { SignupRequest, SignupResponse } from '@/types/auth';
import { postJson } from './apiClient';

const SIGNUP_PATH = '/auth/signup';

/**
 * Creates an account.
 *
 * @param request email and password of the new account
 * @returns the new user with an access token
 * @throws ApiError if the account could not be created
 */
export function signup(request: SignupRequest): Promise<SignupResponse> {
  return postJson<SignupResponse>(SIGNUP_PATH, request);
}
