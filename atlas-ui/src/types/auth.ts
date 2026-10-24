/**
 * Represents the account returned by the API.
 */
export interface UserDto {
  id: string;
  email: string;
}

/**
 * Represents the body of a signup request. Mirrors the API's SignupRequest.
 */
export interface SignupRequest {
  email: string;
  password: string;
}

/**
 * Represents the body of a login request.
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Represents what the browser is told when a session starts. The access token itself never reaches the browser: the
 * server keeps it in an HttpOnly cookie, so the page only learns who signed in and for how long.
 */
export interface SignupResponse {
  user: UserDto;
  expiresIn: number;
}

export type LoginResponse = SignupResponse;

/**
 * Represents the current session as the server describes it. The expiry is a moment in epoch milliseconds.
 */
export interface SessionInfo {
  user: UserDto;
  expiresAt: number;
}
