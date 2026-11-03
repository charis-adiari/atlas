import { useId, type ChangeEvent } from 'react';
import styles from './Field.module.css';

interface EmailFieldProps {
  value: string;
  errorMessage: string | null;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onBlur: () => void;
}

/**
 * Renders the email input with its label and, when there is one, the message explaining what is wrong.
 */
export function EmailField({ value, errorMessage, onChange, onBlur }: EmailFieldProps) {
  const inputId = useId();
  const errorId = `${inputId}-error`;

  return (
    <div className={styles.field}>
      <label htmlFor={inputId} className={styles.label}>
        Email
      </label>
      <input
        id={inputId}
        type="email"
        name="email"
        value={value}
        placeholder="you@example.com"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        className={styles.input}
        aria-invalid={errorMessage !== null}
        aria-describedby={errorMessage === null ? undefined : errorId}
        onChange={onChange}
        onBlur={onBlur}
      />
      {errorMessage !== null && (
        <p id={errorId} className={styles.error}>
          {errorMessage}
        </p>
      )}
    </div>
  );
}
