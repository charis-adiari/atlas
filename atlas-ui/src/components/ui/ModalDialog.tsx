import { useEffect, useRef, type MouseEvent, type ReactNode, type SyntheticEvent } from 'react';
import styles from './ModalDialog.module.css';

interface ModalDialogProps {
  labelledById: string;
  onClose?: () => void;
  isWide?: boolean;
  children: ReactNode;
}

/**
 * Shows its content in a modal dialog. The browser's own dialog handles focus trapping and the Escape key. When
 * onClose is given, Escape and a click on the backdrop dismiss the dialog through it; without it the dialog can only be
 * left through its own content.
 */
export function ModalDialog({ labelledById, onClose, isWide = false, children }: ModalDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog !== null && !dialog.open) {
      dialog.showModal();
    }
  }, []);

  function closeOnBackdropClick(event: MouseEvent<HTMLDialogElement>): void {
    if (onClose !== undefined && event.target === event.currentTarget) {
      onClose();
    }
  }

  function keepOpenOnEscape(event: SyntheticEvent<HTMLDialogElement>): void {
    if (onClose === undefined) {
      event.preventDefault();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className={`${styles.dialog} ${isWide ? styles.wide : ''}`}
      aria-labelledby={labelledById}
      onCancel={keepOpenOnEscape}
      onClose={onClose}
      onClick={closeOnBackdropClick}
    >
      <div className={styles.card}>{children}</div>
    </dialog>
  );
}
