import { useState, type FormEvent } from 'react';
import { signup } from '@/lib/api/authApi';
import { beginSession } from '@/lib/auth/session/sessionService';
import { describeSignupError, getSignupFieldErrors } from '@/lib/auth/signupErrors';
import { normalizeEmail } from '@/lib/auth/validation/emailRules';
import { logUnexpectedError } from '@/lib/logging/logger';
import type { SignupResponse } from '@/types/auth';
import { useSignupFields, type SignupFields } from './useSignupFields';

/**
 * Represents everything the signup form needs to render and react to the user.
 */
export interface UseSignupFormResult extends SignupFields {
  formError: string | null;
  isSubmitting: boolean;
  canSubmit: boolean;
  submit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}

/**
 * Drives the signup form. The checks here only give feedback while typing; the API makes the real decision. A failed
 * signup shows its message and leaves the session untouched, so the user stays anonymous. A successful one starts the session, which the server
 * backs with an HttpOnly cookie. Only the email and password are sent; the confirmation never
 * leaves the browser.
 *
 * @param onSuccess called after the session has been stored
 */
export function useSignupForm(onSuccess: (response: SignupResponse) => void): UseSignupFormResult {
  const fields = useSignupFields();
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canSubmit = fields.isValid && !isSubmitting;

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    fields.clearServerErrors();
    try {
      const response = await signup({
        email: normalizeEmail(fields.email),
        password: fields.password
      });
      beginSession(response);
      onSuccess(response);
    } catch (error) {
      const description = describeSignupError(error);
      if (!description.isExpected) {
        logUnexpectedError('signup', error);
      }
      setFormError(description.message);
      fields.showServerErrors(getSignupFieldErrors(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return { ...fields, formError, isSubmitting, canSubmit, submit };
}
