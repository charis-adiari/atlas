import { NextResponse, type NextRequest } from 'next/server';
import { AUTH_REQUIRED_PATH } from '@/lib/auth/routes';
import { clearSessionCookie, getSessionCookieName } from '@/server/auth/authCookies';
import { readSessionClaims } from '@/server/auth/jwtClaims';

/**
 * Guards the protected pages: a request without a valid, unexpired session cookie is sent to the home page, and a stale
 * cookie is removed on the way. It is only an optimistic check of the cookie; the API still verifies the token on every
 * call it protects.
 */
export function proxy(request: NextRequest): NextResponse {
  const token = request.cookies.get(getSessionCookieName())?.value;

  if (readSessionClaims(token) !== null) {
    return NextResponse.next();
  }
  const response = NextResponse.redirect(new URL(AUTH_REQUIRED_PATH, request.url));
  if (token !== undefined) {
    clearSessionCookie(response);
  }
  return response;
}

export const config = {
  matcher: ['/account/:path*']
};
