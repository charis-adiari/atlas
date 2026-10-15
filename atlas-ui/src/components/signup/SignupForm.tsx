import { useId } from 'react';
import { FormAlert } from '@/components/feedback/FormAlert';
import { Button } from '@/components/ui/Button';
import { useSignupForm } from '@/hooks/useSignupForm';
import type { SignupResponse } from '@/types/auth';
import { EmailField } from './fields/EmailField';
import { PasswordField } from './fields/PasswordField';
import { PasswordRequirements } from './fields/PasswordRequirements';
import styles from './SignupForm.module.css';

interface SignupFormProps {
  onSuccess: (response: SignupResponse) => void;
}

/**
 * Renders the signup fields, the live password checklist and the submit button. The button stays disabled until the
 * email looks valid, the password is strong and the confirmation matches it.
 */
export function SignupForm({ onSuccess }: SignupFormProps) {
  const requirementsId = useId();
  const form = useSignupForm(onSuccess);

  return (
    <form className={styles.form} noValidate onSubmit={form.submit}>
      <EmailField
        value={form.email}
        errorMessage={form.emailError}
        onChange={form.changeEmail}
        onBlur={form.blurEmail}
      />
      <PasswordField
        label="Password"
        name="password"
        value={form.password}
        errorMessage={form.passwordError}
        describedById={requirementsId}
        onChange={form.changePassword}
      />
      <PasswordRequirements id={requirementsId} results={form.passwordRules} />
      <PasswordField
        label="Confirm password"
        name="confirmPassword"
        value={form.confirmPassword}
        errorMessage={form.confirmPasswordError}
        onChange={form.changeConfirmPassword}
        onBlur={form.blurConfirmPassword}
      />
      {form.formError !== null && <FormAlert message={form.formError} />}
      <Button type="submit" isFullWidth disabled={!form.canSubmit}>
        {form.isSubmitting ? 'Creating account…' : 'Create account'}
      </Button>
    </form>
  );
}
