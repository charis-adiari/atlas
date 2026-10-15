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
 * Represents the body of a successful signup response. Mirrors the API's SignupResponse.
 */
export interface SignupResponse {
  user: UserDto;
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}
