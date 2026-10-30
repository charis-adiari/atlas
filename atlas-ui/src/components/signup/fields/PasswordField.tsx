import { useId, useState, type ChangeEvent } from 'react';
import styles from './Field.module.css';

interface PasswordFieldProps {
  label: string;
  name: string;
  value: string;
  errorMessage: string | null;
  describedById?: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
}

/**
 * Renders a password input with a button that reveals what was typed. When describedById is given it points to the
 * element that explains the field, such as the requirements list, so screen readers announce it with the field.
 */
export function PasswordField({
  label,
  name,
  value,
  errorMessage,
  describedById,
  onChange,
  onBlur
}: PasswordFieldProps) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const describedBy =
    [describedById, errorMessage === null ? undefined : errorId].filter(Boolean).join(' ') ||
    undefined;

  return (
    <div className={styles.field}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
      </label>
      <div className={styles.inputWrapper}>
        <input
          id={inputId}
          type={isPasswordVisible ? 'text' : 'password'}
          name={name}
          value={value}
          autoComplete="new-password"
          className={`${styles.input} ${styles.hasTrailingButton}`}
          aria-invalid={errorMessage !== null}
          aria-describedby={describedBy}
          onChange={onChange}
          onBlur={onBlur}
        />
        <button
          type="button"
          className={styles.trailingButton}
          aria-label={`${isPasswordVisible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
          aria-pressed={isPasswordVisible}
          onClick={() => setIsPasswordVisible((isVisible) => !isVisible)}
        >
          <span
            className="material-symbols-rounded"
            aria-hidden="true"
            style={{ fontSize: '1.25rem' }}
          >
            {isPasswordVisible ? 'visibility_off' : 'visibility'}
          </span>
        </button>
      </div>
      {errorMessage !== null && (
        <p id={errorId} className={styles.error}>
          {errorMessage}
        </p>
      )}
    </div>
  );
}
