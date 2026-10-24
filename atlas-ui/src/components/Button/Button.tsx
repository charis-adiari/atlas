import type { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

/**
 * Visual style of a {@link Button}.
 *
 * - `default`: no background or border
 * - `primary`: filled with the primary color
 * - `outline`: bordered, with the parent's background
 * - `primary-large` / `outline-large`: larger versions of the above
 */
export type ButtonVariant = 'default' | 'primary' | 'outline';

/**
 * Size of a {@link Button}.
 *
 * - `default`: compact padding, for toolbars and menus
 * - `large`: roomier padding, for prominent calls to action
 */
export type ButtonSize = 'default' | 'large';

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
   * Padding size of the button. Independent of `variant`, so any variant can
   * be combined with any size.
   * @defaultValue `"default"`
   */
  size?: ButtonSize;

  /**
   * Color of the icons. Exposed as the `data-icon-color` attribute so the
   * stylesheet can target it.
   * @defaultValue `"default"`
   */
  iconColour?: 'default' | 'secondary';

  /**
   * Material Symbols icon name (for example `"add"`) shown before the text.
   * Reduces the left padding so the icon sits closer to the edge.
   */
  startIcon?: string;
}

/**
 * A button with an optional icon before optional text.
 *
 * @remarks
 * The icon is rendered as a Material Symbols ligature and is hidden from
 * assistive technology (`aria-hidden`), so the accessible name comes from
 * text in `children` or an explicit `aria-label`.
 *
 * Use `className` for layout concerns that only the parent knows about
 * (margin, width, alignment). Use `variant`, `size` and `iconColour` for the
 * button's own appearance.
 *
 * The `type` attribute defaults to `"button"` so the component never submits
 * a form by accident. Pass `type="submit"` when you want that.
 *
 * @example
 * Icon-only button. It has no text, so it needs an `aria-label`:
 * ```tsx
 * <Button startIcon="settings" aria-label="Settings" />
 * ```
 *
 * @example
 * Large primary button with an icon:
 * ```tsx
 * <Button variant="primary" size="large" startIcon="notes">
 *   New note
 * </Button>
 * ```
 *
 * @example
 * Extra content next to the label:
 * ```tsx
 * <Button startIcon="search" className={styles.search}>
 *   Search <kbd aria-hidden="true">⌘K</kbd>
 * </Button>
 * ```
 */
export const Button = ({
  variant = 'default',
  size = 'default',
  iconColour = 'default',
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
      className={className ? `${styles.button} ${className}` : styles.button}
      data-variant={variant}
      data-size={size}
      data-icon-colour={iconColour}
      {...rest}
    >
      {startIcon && (
        <span className={iconClass} data-icon-position="start" aria-hidden="true">
          {startIcon}
        </span>
      )}
      {children && <span>{children}</span>}
    </button>
  );
};
