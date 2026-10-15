import { Icon } from '@/components/ui/Icon';
import type { PasswordRuleResult } from '@/lib/auth/validation/passwordRules';
import styles from './PasswordRequirements.module.css';

interface PasswordRequirementsProps {
  id: string;
  results: PasswordRuleResult[];
}

/**
 * Lists what a password must have and ticks each requirement off as the user types. The state is also spelled out in
 * text that only screen readers see, so it does not depend on colour.
 */
export function PasswordRequirements({ id, results }: PasswordRequirementsProps) {
  return (
    <div id={id}>
      <p className={styles.heading}>Password must have</p>
      <ul className={styles.list}>
        {results.map(({ id: ruleId, label, isMet }) => (
          <li key={ruleId} className={isMet ? styles.met : styles.unmet}>
            <span className={styles.marker} aria-hidden="true">
              {isMet && <Icon name="check" size={12} />}
            </span>
            {label}
            <span className={styles.visuallyHidden}>{isMet ? ' (met)' : ' (not met)'}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
