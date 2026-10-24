import type { NextRequest, NextResponse } from 'next/server';
import { rejectInvalidCsrf } from '@/server/security/csrf';
import { problemResponse } from '@/server/security/problem';
import { forwardWithSession } from './apiProxyHandler';
import { forwardedHeaders, MAX_AUTH_BODY_BYTES } from './sessionHandlers';
import { callUpstream, forwardResponse, upstreamUrl } from './upstream';

/**
 * Passes the token from an emailed verification link on to the API. It needs no session, because the link may be
 * opened on another device than the one that signed up, but it must pass the CSRF check like every other
 * state-changing request.
 */
export async function handleVerifyEmail(request: NextRequest): Promise<NextResponse> {
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
    url: upstreamUrl('/auth/verify-email'),
    data: body,
    headers: forwardedHeaders(request)
  });
  if (upstream === null) {
    return problemResponse(502, 'The service is temporarily unavailable.');
  }
  return forwardResponse(upstream);
}

/**
 * Asks the API to email the signed-in user a new verification link.
 */
export function handleResendVerification(request: NextRequest): Promise<NextResponse> {
  return forwardWithSession(request, ['auth', 'resend-verification']);
}

/**
 * Asks the API whether the signed-in user has verified their email address.
 */
export function handleVerificationStatus(request: NextRequest): Promise<NextResponse> {
  return forwardWithSession(request, ['auth', 'verification-status']);
}
