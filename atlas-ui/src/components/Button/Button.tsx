import type { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

/**
 * Visual style of a {@link Button}.
 *
 * - `default`: no background or border
 * - `primary`: filled with the primary color
 * - `outline`: bordered, with a light background
 * - `primary-large` / `outline-large`: larger versions of the above
 */
export type ButtonVariant = 'default' | 'primary' | 'outline' | 'primary-large' | 'outline-large';

/**
 * Props for the {@link Button} component.
 *
 * Extends the native button attributes, so `onClick`, `disabled`, `aria-*`,
 * `popoverTarget` and so on are passed straight through to the `<button>`.
 */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Overall visual style of the button.
   * @defaultValue `"default"`
   */
  variant?: ButtonVariant;

  /**
   * Color of the icons. Exposed as the `data-icon-color` attribute so the
   * stylesheet can target it.
   * @defaultValue `"default"`
   */
  iconColor?: 'default' | 'accent';

  /**
   * Material Symbols icon name (for example `"add"`) shown before the text.
   * Reduces the left padding so the icon sits closer to the edge.
   */
  startIcon?: string;
}

/**
 * A button with an optional icon at the start, the end, or both.
 *
 * @remarks
 * Icons are rendered as Material Symbols ligatures and are hidden from
 * assistive technology (`aria-hidden`), so the accessible name comes from
 * text in `children` or an explicit `aria-label`.
 *
 * Use `className` for layout concerns that only the parent knows about
 * (margin, width, alignment). Use `variant` and `iconColor` for the button's
 * own appearance.
 *
 * The `type` attribute defaults to `"button"` so the component never submits
 * a form by accident. Pass `type="submit"` when you want that.
 *
 * @example
 * Primary button with a icon:
 * ```tsx
 * <Button
 *  startIcon="settings"
 *  aria-label="Settings"
 *  className={styles.newVault}
 * />
 * ```
 *
 * @example
 *
 * ```tsx
 * <Button
 *  startIcon="search"
 *  className={styles.search}
 * >
 *  Search <kbd aria-hidden="true">⌘K</kbd>
 * </Button>
 * ```
 */
export const Button = ({
  variant = 'default',
  iconColor = 'default',
  startIcon,
  type = 'button',
  className,
  children,
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
        <span className={iconClass} data-icon-position="start" aria-hidden="true">
          {startIcon}
        </span>
      )}
      {children}
    </button>
  );
};
