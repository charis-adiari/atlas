import type { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookie, getSessionCookieName } from '@/server/auth/authCookies';
import { readSessionClaims } from '@/server/auth/jwtClaims';
import { rejectInvalidCsrf } from '@/server/security/csrf';
import { problemResponse } from '@/server/security/problem';
import { callUpstream, forwardResponse, upstreamUrl } from './upstream';

export const MAX_PROXY_BODY_BYTES = 12 * 1024 * 1024;

const SEGMENT_PATTERN = /^[A-Za-z0-9_-]+$/;
const OWN_FIRST_SEGMENTS = ['auth'];
const BODYLESS_METHODS = ['GET', 'HEAD'];
const UNAUTHORIZED_STATUS = 401;

/**
 * Represents the route parameters Next passes to the catch-all handler.
 */
export interface ProxyContext {
  params: Promise<{ path: string[] }>;
}

/**
 * Passes a call from the page on to the protected part of the API. The access token is taken from the HttpOnly cookie
 * and sent to the API as a Bearer header, which is the only place it ever leaves the cookie. Requests without a valid
 * session are refused here, state-changing requests must pass the CSRF check, and only plain path segments are
 * accepted so a request cannot reach anywhere but the API's own routes.
 */
export async function handleApiProxy(
  request: NextRequest,
  context: ProxyContext
): Promise<NextResponse> {
  const { path } = await context.params;
  if (!isProxyablePath(path)) {
    return problemResponse(404, 'Not found.');
  }
  return forwardWithSession(request, path);
}

/**
 * Sends a request to the given API path on behalf of the signed-in user, with the same protections as the catch-all
 * proxy: a valid session is required, state-changing requests must pass the CSRF check, and the token only leaves the
 * cookie as a Bearer header. The caller is responsible for the path being safe.
 */
export async function forwardWithSession(
  request: NextRequest,
  path: string[]
): Promise<NextResponse> {
  const rejection = rejectInvalidCsrf(request);
  if (rejection !== null) {
    return rejection;
  }
  const token = request.cookies.get(getSessionCookieName())?.value;
  if (token === undefined || readSessionClaims(token) === null) {
    return unauthenticated(token !== undefined);
  }

  const body = BODYLESS_METHODS.includes(request.method) ? undefined : await request.text();
  if (body !== undefined && Buffer.byteLength(body) > MAX_PROXY_BODY_BYTES) {
    return problemResponse(413, 'The request is too large.');
  }

  const upstream = await callUpstream({
    method: request.method,
    url: upstreamUrl(`/${path.join('/')}${request.nextUrl.search}`),
    data: body,
    headers: upstreamHeaders(request, token)
  });
  if (upstream === null) {
    return problemResponse(502, 'The service is temporarily unavailable.');
  }

  const response = forwardResponse(upstream);
  if (upstream.status === UNAUTHORIZED_STATUS) {
    clearSessionCookie(response);
  }
  return response;
}

/**
 * Checks that every segment is a plain name and that the path is not one this server handles itself.
 */
function isProxyablePath(path: string[]): boolean {
  return (
    path.length > 0 &&
    path.every((segment) => SEGMENT_PATTERN.test(segment)) &&
    !OWN_FIRST_SEGMENTS.includes(path[0])
  );
}

/**
 * Builds the 401 answer, dropping the cookie when there was one that is no longer valid.
 */
function unauthenticated(hasExpiredCookie: boolean): NextResponse {
  const response = problemResponse(UNAUTHORIZED_STATUS, 'Authentication is required.');
  if (hasExpiredCookie) {
    clearSessionCookie(response);
  }
  return response;
}

/**
 * Builds the headers for the API call: the Bearer token, and the content headers of the original request. Cookies and
 * everything else from the browser are left out.
 */
function upstreamHeaders(request: NextRequest, token: string): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    'Content-Type': request.headers.get('content-type') ?? 'application/json'
  };
  const correlationId = request.headers.get('x-correlation-id');
  if (correlationId !== null) {
    headers['X-Correlation-Id'] = correlationId;
  }
  return headers;
}
