import { Icon } from '@/components/ui/Icon';
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
      <Icon name="alert" size={18} />
      <span>{message}</span>
    </p>
  );
}
