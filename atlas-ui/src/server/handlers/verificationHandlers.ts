import { NextResponse, type NextRequest } from 'next/server';
import { establishSession, postToApi } from './sessionHandlers';
import { forwardResponse } from './upstream';

/**
 * Passes the token from an emailed verification link on to the API, which answers with an access token, and starts a
 * session with it. It needs no session beforehand, because the link may be opened on another device than the one that
 * signed up, but it must pass the CSRF check like every other state-changing request.
 */
export function handleVerifyEmail(request: NextRequest): Promise<NextResponse> {
  return establishSession(request, '/auth/verify-email');
}

/**
 * Asks the API to email a new verification link to the address in the body. It needs no session, because an
 * unverified account cannot have one. The API answers 202 whether or not an email went out.
 */
export async function handleResendVerification(request: NextRequest): Promise<NextResponse> {
  const upstream = await postToApi(request, '/auth/resend-verification');
  return upstream instanceof NextResponse ? upstream : forwardResponse(upstream);
}
