import { useState, type FormEvent } from 'react';
import { signup } from '@/lib/api/authApi';
import { saveSession } from '@/lib/auth/session/authSessionStore';
import { getSignupErrorMessage, getSignupFieldErrors } from '@/lib/auth/signupErrors';
import { normalizeEmail } from '@/lib/auth/validation/emailRules';
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
 * signup shows its message and leaves the session untouched, so the user stays anonymous. A successful one stores
 * the access token, which marks the user as signed in. Only the email and password are sent; the confirmation never
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
      saveSession(response);
      onSuccess(response);
    } catch (error) {
      setFormError(getSignupErrorMessage(error));
      fields.showServerErrors(getSignupFieldErrors(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return { ...fields, formError, isSubmitting, canSubmit, submit };
}
