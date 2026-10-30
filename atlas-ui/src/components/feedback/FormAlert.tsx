import styles from './FormAlert.module.css';

interface FormAlertProps {
  message: string;
}

/**
 * Shows an error that applies to the whole form, announced to screen readers as it appears.
 */
export function FormAlert({ message }: FormAlertProps) {
  return (
    <p role="alert" className={styles.alert}>
      <span
        className="material-symbols-rounded"
        aria-hidden="true"
        style={{ fontSize: '1.125rem' }}
      >
        error
      </span>
      <span>{message}</span>
    </p>
  );
}
