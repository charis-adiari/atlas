'use client';

import { Button } from '@/components/Button/Button';
import styles from './Sidebar.module.css';
import Image from 'next/image';

export const Sidebar = () => {
  return (
    <div className={styles.sidebar}>
      <div>
        <div className={styles.header}>
          <Image src="/logo.svg" alt="Logo" className={styles.logo} width={425} height={97} />
          <Button variant="outline" text="New vault" endIcon="keyboard_arrow_down" />
        </div>
        <div className={styles.content}>
          <div className={styles.buttonRow}>
            <Button variant="primary" startIcon="add" text="New" />
            <Button startIcon="settings" />
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <div>
          <Button startIcon="upload" text="Import" className={styles.btnFullWidth} />
          <Button startIcon="share_windows" text="Export vault" className={styles.btnFullWidth} />
        </div>
        <Button startIcon="settings" text="Settings" className={styles.btnFullWidth} />
      </div>
    </div>
  );
};
