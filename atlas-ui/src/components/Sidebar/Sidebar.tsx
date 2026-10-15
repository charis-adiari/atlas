'use client';

import { Button } from '@/components/Button/Button';
import { ButtonDropdown } from '@/components/ButtonDropdown/ButtonDropdown';
import Image from 'next/image';
import styles from './Sidebar.module.css';
import { getStore } from '@/lib/storage';
import { useEffect, useState } from 'react';
import { Vault } from '@/lib/storage/types';
import { usePathname } from 'next/navigation';

export const Sidebar = () => {
  const pathname = usePathname();
  const [vaults, setVaults] = useState<Vault[]>([]);

  const dropdownButtonItems = [
    {
      label: 'New note',
      icon: 'notes',
      trailing: (
        <kbd aria-hidden="true" className={styles.keyboardShortcut}>
          N
        </kbd>
      )
    },
    {
      label: 'New canvas',
      icon: 'grid_on',
      trailing: (
        <kbd aria-hidden="true" className={styles.keyboardShortcut}>
          C
        </kbd>
      )
    },
    {
      label: 'New folder',
      icon: 'folder',
      trailing: (
        <kbd aria-hidden="true" className={styles.keyboardShortcut}>
          &#8679;N
        </kbd>
      )
    }
  ];

  const store = getStore();

  // useEffect(() => {
  //   const loadVaults = async () => setVaults(await store.getVaults());
  //   loadVaults();
  // }, []); // empty array = run once on mount

  // TODO: #{ticket no} Replace with shared vault state
  useEffect(() => {
    let cancelled = false;
    const loadVaults = async () => {
      store.getVaults().then((result) => {
        if (!cancelled) setVaults(result);
      });
    };
    loadVaults();
    return () => {
      cancelled = true; // ignore stale results if the path changes quickly
    };
  }, [pathname]);

  const vaultOptions = vaults
    .filter((vault) => vault.name !== '')
    .map((vault) => (
      <option key={vault.id} value={vault.id}>
        {vault.name}
      </option>
    ));

  return (
    <div className={styles.sidebar}>
      <div>
        <div className={styles.header}>
          <Image src="/logo.svg" alt="Logo" className={styles.logo} width={425} height={97} />

          {/* TODO: Populate using list of vaults from storage */}
          <select name="vault-picker" id="vault-picker">
            {vaultOptions}
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
