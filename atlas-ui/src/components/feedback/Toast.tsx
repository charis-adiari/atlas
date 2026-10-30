import { useEffect } from 'react';
import styles from './Toast.module.css';

interface ToastProps {
  title: string;
  message: string;
  onDismiss: () => void;
}

const TOAST_DURATION_MS = 8000;

/**
 * Shows a short confirmation at the bottom of the screen, which goes away by itself or when dismissed.
 */
export function Toast({ title, message, onDismiss }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div role="status" className={styles.toast}>
      <span className={styles.marker}>
        <span
          className="material-symbols-rounded"
          aria-hidden="true"
          style={{ fontSize: '0.875rem' }}
        >
          check
        </span>
      </span>
      <div className={styles.text}>
        <p className={styles.title}>{title}</p>
        <p className={styles.message}>{message}</p>
      </div>
      <button type="button" className={styles.dismiss} onClick={onDismiss} aria-label="Dismiss">
        <span className="material-symbols-rounded" aria-hidden="true" style={{ fontSize: '1rem' }}>
          close
        </span>
      </button>
    </div>
  );
}
