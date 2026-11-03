const MAX_TOKEN_LENGTH = 8192;
const MILLIS_PER_SECOND = 1000;
const JWT_PARTS = 3;

/**
 * Represents what the server reads from the access token to know who is signed in and until when.
 */
export interface SessionClaims {
  userId: string;
  email: string;
  expiresAt: number;
}

/**
 * Reads the claims of an access token that has not expired. It does not check the signature: the token was issued by the
 * API and is kept in an HttpOnly cookie, and the API verifies it on every call it protects. This only decides what to
 * show and whether a request is worth forwarding.
 *
 * @param token the value of the session cookie, if there is one
 * @param now the current time in epoch milliseconds
 * @returns the claims, or null if there is no token, it is malformed, or it has expired
 */
export function readSessionClaims(
  token: string | undefined,
  now: number = Date.now()
): SessionClaims | null {
  const payload = decodePayload(token);
  const { sub, email, exp } = payload ?? {};

  if (typeof sub !== 'string' || typeof email !== 'string' || typeof exp !== 'number') {
    return null;
  }
  const expiresAt = exp * MILLIS_PER_SECOND;
  return Number.isFinite(expiresAt) && expiresAt > now ? { userId: sub, email, expiresAt } : null;
}

/**
 * Decodes the middle part of a token into an object, or returns null if it is not one.
 */
function decodePayload(token: string | undefined): Record<string, unknown> | null {
  if (token === undefined || token === '' || token.length > MAX_TOKEN_LENGTH) {
    return null;
  }
  const parts = token.split('.');
  if (parts.length !== JWT_PARTS) {
    return null;
  }
  try {
    const payload: unknown = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return typeof payload === 'object' && payload !== null && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}
