import type { Metadata } from 'next';
import { VerifyEmailPage } from '@/components/verification/VerifyEmailPage';

export const metadata: Metadata = {
  title: 'Verify your email address – Atlas'
};

/**
 * Renders the page the emailed verification link opens. The token travels in the fragment of the address, so it never
 * reaches this server.
 */
export default function VerifyEmail() {
  return <VerifyEmailPage />;
}
