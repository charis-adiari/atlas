'use client';

import { useEffect, useRef, useState } from 'react';
import { ApiError } from '@/lib/api/ApiError';
import { verifyEmail } from '@/lib/api/authApi';
import { beginSession } from '@/lib/auth/session/sessionService';
import { logUnexpectedError } from '@/lib/logging/logger';

export type VerifyEmailLinkStatus = 'verifying' | 'verified' | 'failed';

const TOKEN_PARAMETER = 'token';
const BAD_REQUEST_STATUS = 400;

/**
 * Reads the token from the fragment of the emailed link, which is the part after the #, and removes it from the
 * address bar straight away so it does not stay in the browser history or get copied along with the page address. A
 * fragment is never sent to a server and never appears in a referrer header.
 *
 * @returns the token, or null if the link has none
 */
function takeTokenFromAddress(): string | null {
  const token = new URLSearchParams(window.location.hash.slice(1)).get(TOKEN_PARAMETER);
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
  return token === null || token === '' ? null : token;
}

/**
 * Sends the token to the API, which verifies the address and signs its owner in. A token the API does not accept is an
 * expected outcome, anything else is logged.
 *
 * @returns true if the email address is now verified and the user signed in
 */
async function verifyToken(token: string | null): Promise<boolean> {
  if (token === null) {
    return false;
  }
  try {
    beginSession(await verifyEmail(token));
    return true;
  } catch (error) {
    const isRefused = error instanceof ApiError && error.statusCode === BAD_REQUEST_STATUS;
    if (!isRefused) {
      logUnexpectedError('verification', error);
    }
    return false;
  }
}

/**
 * Verifies the email address with the token in the address the page was opened with. The attempt is made once, even
 * when React runs the effect twice in development, because a token only works once.
 */
export function useVerifyEmailLink(): VerifyEmailLinkStatus {
  const [status, setStatus] = useState<VerifyEmailLinkStatus>('verifying');
  const attempt = useRef<Promise<boolean> | null>(null);

  useEffect(() => {
    attempt.current ??= verifyToken(takeTokenFromAddress());
    let isCurrent = true;

    attempt.current.then((isVerified) => {
      if (isCurrent) {
        setStatus(isVerified ? 'verified' : 'failed');
      }
    });
    return () => {
      isCurrent = false;
    };
  }, []);

  return status;
}
