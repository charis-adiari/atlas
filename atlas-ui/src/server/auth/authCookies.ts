import type { NextResponse } from 'next/server';
import { isSecureCookieRequired } from '@/server/config';

export const MAX_SESSION_COOKIE_SECONDS = 24 * 60 * 60;
export const CSRF_COOKIE_SECONDS = 24 * 60 * 60;

const SESSION_COOKIE = 'atlas_session';
const CSRF_COOKIE = 'atlas_csrf';
const HOST_PREFIX = '__Host-';

/**
 * Gets the name of the cookie that holds the access token. Over HTTPS it carries the __Host- prefix, which makes the
 * browser refuse it unless it is Secure, has no Domain and covers the whole site.
 */
export function getSessionCookieName(): string {
  return isSecureCookieRequired() ? `${HOST_PREFIX}${SESSION_COOKIE}` : SESSION_COOKIE;
}

/**
 * Gets the name of the cookie that holds the CSRF token.
 */
export function getCsrfCookieName(): string {
  return isSecureCookieRequired() ? `${HOST_PREFIX}${CSRF_COOKIE}` : CSRF_COOKIE;
}

/**
 * Stores the access token in an HttpOnly cookie that scripts cannot read. It lives as long as the token, capped at a day.
 *
 * @param response the response that will carry the Set-Cookie header
 * @param token the access token issued by the API
 * @param expiresInSeconds the lifetime the API gave the token
 */
export function setSessionCookie(
  response: NextResponse,
  token: string,
  expiresInSeconds: number
): void {
  const maxAge = Math.max(1, Math.min(Math.floor(expiresInSeconds), MAX_SESSION_COOKIE_SECONDS));
  response.cookies.set(getSessionCookieName(), token, cookieOptions(maxAge));
}

/**
 * Removes the access token cookie.
 */
export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(getSessionCookieName(), '', cookieOptions(0));
}

/**
 * Stores the CSRF token in an HttpOnly cookie. The page receives the same value in a response body and sends it back in
 * a header, so a forged cross-site request, which cannot read it, cannot match the two.
 */
export function setCsrfCookie(response: NextResponse, token: string): void {
  response.cookies.set(getCsrfCookieName(), token, cookieOptions(CSRF_COOKIE_SECONDS));
}

/**
 * Removes the CSRF token cookie.
 */
export function clearCsrfCookie(response: NextResponse): void {
  response.cookies.set(getCsrfCookieName(), '', cookieOptions(0));
}

/**
 * Builds the attributes every auth cookie shares: HttpOnly, Secure over HTTPS, SameSite=Lax so it is not sent with
 * cross-site POSTs, and a path covering the whole site.
 */
function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: isSecureCookieRequired(),
    sameSite: 'lax' as const,
    path: '/',
    maxAge
  };
}
