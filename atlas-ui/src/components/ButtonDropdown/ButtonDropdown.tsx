'use client';

import { Button, ButtonVariant } from '@/components/Button/Button';
import { ReactNode, useId } from 'react';
import styles from './ButtonDropdown.module.css';

/**
 * A single entry in a {@link ButtonDropdown} menu.
 */
export interface ButtonDropdownItem {
  /** Text shown for the item. Also used as the React key, so keep it unique. */
  label: string;

  /** Optional Material Symbols icon name shown before the label. */
  icon?: string;

  /**
   * Optional content pushed to the right edge of the item, such as a
   * keyboard shortcut, a badge, or a checkmark icon.
   */
  trailing?: ReactNode;

  /**
   * Called when the item is clicked or activated with the keyboard.
   * The menu closes automatically afterwards.
   */
  onSelect?: () => void;
}

/**
 * Props for the {@link ButtonDropdown} component.
 */
interface ButtonDropdownProps {
  /** Text shown on the trigger button. */
  label: string;

  /** Entries shown in the menu, in order. */
  items: ButtonDropdownItem[];

  /**
   * Variant of the trigger button.
   * @defaultValue `"default"`
   */
  triggerVariant?: ButtonVariant;

  /** Material Symbols icon name of the trigger button icon shown before the text. */
  triggerStartIcon?: string;

  /** Whether to display a dropdown arrow after the trigger button text */
  showDropdownArrow?: boolean;
}

/**
 * A dropdown menu whose trigger and items are {@link Button} components.
 *
 * @remarks
 * Built on the HTML Popover API: the browser handles toggling, closing on
 * Escape or an outside click, top-layer rendering, and returning focus to the
 * trigger. Positioning uses CSS anchor positioning, so it needs a browser that
 * supports it.
 *
 * Opening the menu moves focus to the first item.
 *
 * This is a Client Component. Because `onSelect` is a function, whichever
 * component renders `<ButtonDropdown>` must also be a Client Component.
 *
 * Use `triggerVariant` to set the {@link ButtonVariant} of the trigger button to something other than `default`.
 *
 * Use `triggerStartIcon` and `showDropdownArrow` to modify the icons in the trigger button.
 *
 * @example
 * ```tsx
 * "use client";
 *
 * <ButtonDropdown
 *   label="New vault"
 *   items={[
 *     { label: "Personal", icon: "person", onSelect: () => createVault("personal") },
 *     { label: "Shared", icon: "group", onSelect: () => createVault("shared") },
 *   ]}
 * />
 * ```
 */
export const ButtonDropdown = ({
  label,
  items,
  triggerVariant = 'default',
  triggerStartIcon,
  showDropdownArrow = true
}: ButtonDropdownProps) => {
  const id = useId();
  const menuId = `menu-${id.replace(/:/g, '')}`;
  const anchorName = `--anchor-${id.replace(/:/g, '')}`;

  return (
    <div className={styles.dropdown}>
      <Button
        variant={triggerVariant}
        startIcon={triggerStartIcon}
        className={styles.trigger}
        popoverTarget={menuId}
        aria-haspopup="menu"
        style={{ anchorName } as React.CSSProperties}
      >
        {label}
        {showDropdownArrow && (
          <span className={`material-symbols-rounded ${styles.chevron}`} aria-hidden="true">
            keyboard_arrow_down
          </span>
        )}
      </Button>

      <div
        id={menuId}
        popover="auto"
        className={styles.menu}
        role="menu"
        style={{ positionAnchor: anchorName } as React.CSSProperties}
      >
        {items.map((item) => (
          <Button
            key={item.label}
            role="menuitem"
            startIcon={item.icon}
            className={styles.item}
            popoverTarget={menuId}
            popoverTargetAction="hide"
            onClick={item.onSelect}
          >
            {item.label}
            {item.trailing && <span className={styles.trailing}>{item.trailing}</span>}
          </Button>
        ))}
      </div>
    </div>
  );
};
