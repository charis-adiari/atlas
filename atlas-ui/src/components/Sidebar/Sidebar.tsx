'use client';

import { Button } from '@/components/Button/Button';
import { ButtonDropdown } from '@/components/ButtonDropdown/ButtonDropdown';
import Image from 'next/image';
import styles from './Sidebar.module.css';

export const Sidebar = () => {
  const dropdownButtonItems = [
    {
      label: 'New note',
      icon: 'notes',
      trailing: <kbd aria-hidden="true" className={styles.keyboardShortcut}>N</kbd>
    },
    { 
      label: 'New canvas', 
      icon: 'grid_on',
      trailing: <kbd aria-hidden="true" className={styles.keyboardShortcut}>C</kbd>
    },
    { 
      label: 'New folder', 
      icon: 'folder',
      trailing: <kbd aria-hidden="true" className={styles.keyboardShortcut}>&#8679;N</kbd> 
    }
  ];

  return (
    <div className={styles.sidebar}>
      <div>
        <div className={styles.header}>
          <Image src="/logo.svg" alt="Logo" className={styles.logo} width={425} height={97} />
          <select name="vault-picker" id="vault-picker">
            <option value="new-vault">New vault</option>
          </select>
        </div>
        <div className={styles.content}>
          <div className={styles.buttonRow}>
            <ButtonDropdown
              triggerVariant="primary"
              triggerStartIcon="add"
              showDropdownArrow={false}
              label="New"
              items={dropdownButtonItems}
            />
            <Button startIcon="settings" aria-label="Settings" />
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <div>
          <Button startIcon="upload" className={styles.btnFullWidth}>
            Import
          </Button>
          <Button startIcon="share_windows" className={styles.btnFullWidth}>
            Export vault
          </Button>
        </div>

        <Button startIcon="settings" className={styles.btnFullWidth}>
          Settings
        </Button>
      </div>
    </div>
  );
};
