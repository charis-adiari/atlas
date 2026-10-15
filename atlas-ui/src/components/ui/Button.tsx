import type { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  isFullWidth?: boolean;
}

/**
 * Renders a button, primary by default. It defaults to type "button" so it never submits a form by accident.
 */
export function Button({
  variant = 'primary',
  isFullWidth = false,
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  const classNames = [
    styles.button,
    variant === 'secondary' ? styles.secondary : '',
    isFullWidth ? styles.fullWidth : '',
    className ?? ''
  ]
    .filter(Boolean)
    .join(' ');

  return <button type={type} className={classNames} {...rest} />;
}
