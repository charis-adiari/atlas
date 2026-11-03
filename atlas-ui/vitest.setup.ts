import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import { setEmailVerificationProvider } from '@/lib/auth/verification/emailVerification';

vi.mock('next/navigation', async () => {
  const { routerMock } = await import('@/test/navigationMock');
  return { useRouter: () => routerMock };
});

HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
  this.setAttribute('open', '');
};

HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
  this.removeAttribute('open');
  this.dispatchEvent(new Event('close'));
};

beforeEach(() => {
  // Keeps tests from polling the API: the link is never opened unless a test installs a provider that says so.
  setEmailVerificationProvider({
    sendVerification: () => Promise.resolve(),
    checkVerified: () => Promise.resolve(false)
  });
});

afterEach(() => {
  cleanup();
});
