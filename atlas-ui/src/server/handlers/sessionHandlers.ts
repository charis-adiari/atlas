import { NextRequest, NextResponse } from 'next/server';
import {
  clearCsrfCookie,
  clearSessionCookie,
  getCsrfCookieName,
  getSessionCookieName,
  setCsrfCookie,
  setSessionCookie
} from '@/server/auth/authCookies';
import { readSessionClaims } from '@/server/auth/jwtClaims';
import {
  generateCsrfToken,
  isValidCsrfTokenFormat,
  rejectInvalidCsrf
} from '@/server/security/csrf';
import { NO_STORE_HEADERS, problemResponse } from '@/server/security/problem';
import { callUpstream, forwardResponse, upstreamUrl } from './upstream';

export const MAX_AUTH_BODY_BYTES = 64 * 1024;

const JSON_CONTENT_TYPE = 'application/json';
const FIRST_SUCCESS_STATUS = 200;
const FIRST_NON_SUCCESS_STATUS = 300;

interface IssuedToken {
  accessToken: string;
  expiresIn: number;
}

/**
 * Handles a signup: passes it to the API and, when the account is created, keeps the access token in an HttpOnly cookie
 * instead of giving it to the page. The API only sends the token, so who signed in is read from the token's claims.
 * The page is told who signed in and for how long.
 */
export function handleSignup(request: NextRequest): Promise<NextResponse> {
  return establishSession(request, '/auth/signup');
}

/**
 * Handles a login the same way as a signup. The API does not offer a login endpoint yet; this is ready for when it does
 * and answers with the API's own error until then.
 */
export function handleLogin(request: NextRequest): Promise<NextResponse> {
  return establishSession(request, '/auth/login');
}

/**
 * Handles a logout by removing the session and CSRF cookies.
 */
export function handleLogout(request: NextRequest): NextResponse {
  const rejection = rejectInvalidCsrf(request);
  if (rejection !== null) {
    return rejection;
  }
  const response = new NextResponse(null, { status: 204, headers: NO_STORE_HEADERS });
  clearSessionCookie(response);
  clearCsrfCookie(response);
  return response;
}

/**
 * Reports who is signed in, as far as the session cookie says, or answers 401 and drops a cookie that is no longer valid.
 */
export function handleSession(request: NextRequest): NextResponse {
  const token = request.cookies.get(getSessionCookieName())?.value;
  const claims = readSessionClaims(token);

  if (claims === null) {
    const response = problemResponse(401, 'There is no active session.');
    if (token !== undefined) {
      clearSessionCookie(response);
    }
    return response;
  }
  return NextResponse.json(
    { user: { id: claims.userId, email: claims.email }, expiresAt: claims.expiresAt },
    { headers: NO_STORE_HEADERS }
  );
}

/**
 * Hands the page a CSRF token, creating the cookie that goes with it if the browser does not have a valid one yet.
 */
export function handleCsrf(request: NextRequest): NextResponse {
  const existing = request.cookies.get(getCsrfCookieName())?.value;
  const isReusable = existing !== undefined && isValidCsrfTokenFormat(existing);
  const token = isReusable ? existing : generateCsrfToken();
  const response = NextResponse.json({ csrfToken: token }, { headers: NO_STORE_HEADERS });

  if (!isReusable) {
    setCsrfCookie(response, token);
  }
  return response;
}

/**
 * Forwards a signup or login to the API and turns a successful answer into a session cookie.
 */
async function establishSession(request: NextRequest, path: string): Promise<NextResponse> {
  const rejection = rejectInvalidCsrf(request);
  if (rejection !== null) {
    return rejection;
  }
  const body = await request.text();
  if (Buffer.byteLength(body) > MAX_AUTH_BODY_BYTES) {
    return problemResponse(413, 'The request is too large.');
  }

  const upstream = await callUpstream({
    method: 'POST',
    url: upstreamUrl(path),
    data: body,
    headers: forwardedHeaders(request)
  });
  if (upstream === null) {
    return problemResponse(502, 'The service is temporarily unavailable.');
  }
  if (upstream.status < FIRST_SUCCESS_STATUS || upstream.status >= FIRST_NON_SUCCESS_STATUS) {
    return forwardResponse(upstream);
  }
  return sessionResponse(upstream.data);
}

/**
 * Builds the answer for the page and sets the cookies, or reports that the API's answer was not what was expected.
 */
function sessionResponse(upstreamBody: string): NextResponse {
  const issued = parseIssuedToken(upstreamBody);
  if (issued === null) {
    console.error('[atlas-server] the API answered a session request with an unexpected body');
    return problemResponse(502, 'The service gave an unexpected answer.');
  }

  const claims = readSessionClaims(issued.accessToken);
  if (claims === null) {
    console.error('[atlas-server] the API issued an access token that could not be read');
    return problemResponse(502, 'The service gave an unexpected answer.');
  }

  const response = NextResponse.json(
    { user: { id: claims.userId, email: claims.email }, expiresIn: issued.expiresIn },
    { status: 201, headers: NO_STORE_HEADERS }
  );
  setSessionCookie(response, issued.accessToken, issued.expiresIn);
  setCsrfCookie(response, generateCsrfToken());
  return response;
}

/**
 * Reads the token and its lifetime out of the API's answer.
 */
function parseIssuedToken(body: string): IssuedToken | null {
  try {
    const candidate = JSON.parse(body) as Partial<IssuedToken> | null;
    const isValid =
      typeof candidate?.accessToken === 'string' &&
      candidate.accessToken !== '' &&
      typeof candidate.expiresIn === 'number';

    return isValid ? (candidate as IssuedToken) : null;
  } catch {
    return null;
  }
}

/**
 * Picks the headers worth passing to the API. Cookies and everything else from the browser are left out.
 */
export function forwardedHeaders(request: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': JSON_CONTENT_TYPE,
    Accept: JSON_CONTENT_TYPE
  };
  const correlationId = request.headers.get('x-correlation-id');
  if (correlationId !== null) {
    headers['X-Correlation-Id'] = correlationId;
  }
  return headers;
}
