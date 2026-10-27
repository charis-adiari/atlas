import { useState, type FormEvent } from 'react';
import { FormAlert } from '@/components/feedback/FormAlert';
import { EmailField } from '@/components/signup/fields/EmailField';
import { Button } from '@/components/ui/Button';
import { ApiError } from '@/lib/api/ApiError';
import { NETWORK_ERROR_STATUS } from '@/lib/api/httpClient';
import { getEmailVerificationProvider } from '@/lib/auth/verification/emailVerification';
import {
  CONNECTION_PROBLEM_MESSAGE,
  TOO_MANY_ATTEMPTS_MESSAGE,
  UNEXPECTED_SIGNUP_ERROR_MESSAGE
} from '@/lib/auth/signupErrors';
import { normalizeEmail, validateEmail } from '@/lib/auth/validation/emailRules';
import { logUnexpectedError } from '@/lib/logging/logger';
import styles from './ResendVerificationForm.module.css';

export const RESEND_SENT_MESSAGE =
  "If that address belongs to an account that still needs verifying, we've emailed it a new link.";

const TOO_MANY_REQUESTS_STATUS = 429;

/**
 * Lets someone whose link did not work ask for a new one by typing their address. They cannot be signed in yet, so
 * the address is the only thing to go on. The answer never says whether the address has an account, because the API
 * does not either.
 */
export function ResendVerificationForm() {
  const [email, setEmail] = useState('');
  const [hasBlurred, setHasBlurred] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const emailError = validateEmail(email);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setHasBlurred(true);
    if (emailError !== null || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      await getEmailVerificationProvider().sendVerification(normalizeEmail(email));
      setIsSent(true);
    } catch (error) {
      setFormError(describeResendError(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSent) {
    return (
      <p className={styles.sent} role="status">
        {RESEND_SENT_MESSAGE}
      </p>
    );
  }
  return (
    <form className={styles.form} noValidate onSubmit={submit}>
      <EmailField
        value={email}
        errorMessage={hasBlurred ? emailError : null}
        onChange={(event) => setEmail(event.target.value)}
        onBlur={() => setHasBlurred(true)}
      />
      {formError !== null && <FormAlert message={formError} />}
      <Button type="submit" isFullWidth disabled={isSubmitting}>
        {isSubmitting ? 'Sending…' : 'Send a new link'}
      </Button>
    </form>
  );
}

/**
 * Turns a failed request into a message, logging anything that was not expected.
 */
function describeResendError(error: unknown): string {
  const status = error instanceof ApiError ? error.statusCode : null;
  if (status === TOO_MANY_REQUESTS_STATUS) {
    return TOO_MANY_ATTEMPTS_MESSAGE;
  }
  if (status === NETWORK_ERROR_STATUS) {
    return CONNECTION_PROBLEM_MESSAGE;
  }
  logUnexpectedError('verification', error);
  return UNEXPECTED_SIGNUP_ERROR_MESSAGE;
}
