import type { ButtonHTMLAttributes } from "react";
import styles from "./Button.module.css";

export type ButtonVariant =
  | "default"
  | "primary"
  | "outline"
  | "primary-large"
  | "outline-large";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  iconColor?: "default" | "accent";
  startIcon?: string;
  endIcon?: string;
  text?: string;
}

export const Button = ({
  variant = "default",
  iconColor = "default",
  startIcon,
  endIcon,
  type = "button",
  className,
  text,
  ...rest
}: ButtonProps) => {
  const iconClass = `material-symbols-rounded ${styles.icon}`;

  return (
    <button
      type={type}
      className={className ? `${styles.btn} ${className}` : styles.btn}
      data-variant={variant}
      data-icon-color={iconColor}
      {...rest}
    >
      {startIcon && (
        <span className={iconClass} aria-hidden="true">
          {startIcon}
        </span>
      )}
      {text && (<span>{text}</span>)}
      {endIcon && (
        <span className={iconClass} aria-hidden="true">
          {endIcon}
        </span>
      )}
    </button>
  );
}