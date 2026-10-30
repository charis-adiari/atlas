import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { NextRequest, NextResponse } from 'next/server';
import { getCsrfCookieName } from '@/server/auth/authCookies';
import { getAllowedOrigins } from '@/server/config';
import { problemResponse } from './problem';

export const CSRF_HEADER_NAME = 'x-csrf-token';
export const CSRF_INVALID_CODE = 'csrf_invalid';

const CSRF_TOKEN_BYTES = 32;
const CSRF_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];
const SAME_SITE_VALUES = ['same-origin', 'none'];

/**
 * Creates a random CSRF token.
 */
export function generateCsrfToken(): string {
  return randomBytes(CSRF_TOKEN_BYTES).toString('base64url');
}

/**
 * Checks that a value has the shape of a token this server generates.
 */
export function isValidCsrfTokenFormat(token: string): boolean {
  return CSRF_TOKEN_PATTERN.test(token);
}

/**
 * Checks that a request that changes data really came from this app's own pages. Three things must hold: the Origin and
 * Sec-Fetch-Site headers, when the browser sends them, must say the request is same-site; the CSRF cookie must be
 * present; and the X-CSRF-Token header must equal it, which a page on another site cannot arrange because it cannot read
 * the token. Requests that only read data are not checked.
 *
 * @returns null if the request may go ahead, otherwise the 403 response to send
 */
export function rejectInvalidCsrf(request: NextRequest): NextResponse | null {
  if (SAFE_METHODS.includes(request.method.toUpperCase()) || isTrustedRequest(request)) {
    return null;
  }
  return problemResponse(403, 'The request could not be verified.', CSRF_INVALID_CODE);
}

/**
 * Applies the origin checks and the double-submit comparison.
 */
function isTrustedRequest(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const fetchSite = request.headers.get('sec-fetch-site');

  if (origin !== null && !getAllowedOrigins(request.nextUrl.origin).includes(origin)) {
    return false;
  }
  if (fetchSite !== null && !SAME_SITE_VALUES.includes(fetchSite)) {
    return false;
  }
  const cookie = request.cookies.get(getCsrfCookieName())?.value;
  const header = request.headers.get(CSRF_HEADER_NAME);

  return cookie !== undefined && header !== null && areEqual(cookie, header);
}

/**
 * Compares two strings in constant time.
 */
function areEqual(first: string, second: string): boolean {
  const a = Buffer.from(first);
  const b = Buffer.from(second);
  return a.length === b.length && timingSafeEqual(a, b);
}
