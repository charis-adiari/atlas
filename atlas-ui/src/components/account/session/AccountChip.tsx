import styles from './AccountChip.module.css';

interface AccountChipProps {
  email: string;
}

const INITIALS_LENGTH = 2;

/**
 * Shows the signed-in user as a round badge with the first letters of their email.
 */
export function AccountChip({ email }: AccountChipProps) {
  const initials = email.slice(0, INITIALS_LENGTH).toUpperCase();

  return (
    <span role="img" aria-label={`Signed in as ${email}`} title={email} className={styles.chip}>
      {initials}
    </span>
  );
}
