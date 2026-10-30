'use client';

import { AuthStatus } from '@/lib/auth/session/authSessionStore';
import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useAuthSession } from '@/hooks/useAuthSession';
import { AUTH_REQUIRED_PATH } from '@/lib/auth/routes';

interface RequireSessionProps {
  children: ReactNode;
}

/**
 * Shows its content only to a signed-in user and sends anonymous visitors home, including when a session ends while
 * the page is open. The server also checks the session before serving a protected page; this covers the case where it
 * ends afterwards.
 */
export function RequireSession({ children }: RequireSessionProps) {
  const router = useRouter();
  const { status } = useAuthSession();

  useEffect(() => {
    if (status === AuthStatus.anonymous) {
      router.replace(AUTH_REQUIRED_PATH);
    }
  }, [status, router]);

  return status === AuthStatus.authenticated ? children : null;
}
