import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  API_EMAIL_VERIFICATION,
  NO_EMAIL_VERIFICATION,
  getEmailVerificationProvider,
  setEmailVerificationProvider
} from './emailVerification';

afterEach(() => {
  setEmailVerificationProvider(null);
});

describe('the provider that does not verify', () => {
  it('requires nothing and reports every address as verified', async () => {
    // Arrange
    const provider = NO_EMAIL_VERIFICATION;

    // Act
    const isVerified = await provider.checkVerified();

    // Assert
    expect(provider.isRequired).toBe(false);
    expect(isVerified).toBe(true);
    await expect(provider.sendVerification('jd@example.com')).resolves.toBeUndefined();
  });
});

describe('setEmailVerificationProvider', () => {
  it('lets another provider replace the current one', () => {
    // Arrange
    const real = { isRequired: true, sendVerification: vi.fn(), checkVerified: vi.fn() };

    // Act
    setEmailVerificationProvider(real);

    // Assert
    expect(getEmailVerificationProvider()).toBe(real);
  });

  it('restores the provider backed by the API when given null', () => {
    // Arrange
    setEmailVerificationProvider({
      isRequired: true,
      sendVerification: vi.fn(),
      checkVerified: vi.fn()
    });

    // Act
    setEmailVerificationProvider(null);

    // Assert
    expect(getEmailVerificationProvider()).toBe(API_EMAIL_VERIFICATION);
  });
});

describe('the provider backed by the API', () => {
  it('requires verification', () => {
    // Assert
    expect(API_EMAIL_VERIFICATION.isRequired).toBe(true);
  });
});
