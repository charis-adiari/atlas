import { LOCAL_VAULT_DATA_KEY } from '@/lib/migration/local/localVaultData';
import type { MigrationRequest } from '@/types/migration';

export const PERSONAL_VAULT_ID = 'a0000000-0000-4000-8000-000000000001';
export const WORK_VAULT_ID = 'a0000000-0000-4000-8000-000000000002';
export const READING_VAULT_ID = 'a0000000-0000-4000-8000-000000000003';

export const LOCAL_VAULT_SUMMARY_TEXT = '3 vaults · 4 notes · 2 canvases';

/**
 * Builds a realistic set of local vaults: three vaults, nested folders, notes, canvases and backlinks. It uses only
 * the fields the API knows, with ISO-8601 timestamps, so it is what a migration should send unchanged.
 */
export function createLocalVaultData(): MigrationRequest {
  return {
    vaults: [
      { id: PERSONAL_VAULT_ID, name: 'Personal', createdAt: '2026-01-01T09:00:00Z' },
      { id: WORK_VAULT_ID, name: 'Work ideas', createdAt: '2026-02-01T09:00:00Z' },
      { id: READING_VAULT_ID, name: 'Reading list', createdAt: '2026-03-01T09:00:00Z' }
    ],
    folders: [
      {
        id: 'f0000000-0000-4000-8000-000000000001',
        vaultId: PERSONAL_VAULT_ID,
        parentFolderId: null,
        name: 'Journal'
      },
      {
        id: 'f0000000-0000-4000-8000-000000000002',
        vaultId: PERSONAL_VAULT_ID,
        parentFolderId: 'f0000000-0000-4000-8000-000000000001',
        name: '2026'
      },
      {
        id: 'f0000000-0000-4000-8000-000000000003',
        vaultId: WORK_VAULT_ID,
        parentFolderId: null,
        name: 'Projects'
      }
    ],
    files: [
      {
        id: 'd0000000-0000-4000-8000-000000000001',
        vaultId: PERSONAL_VAULT_ID,
        folderId: 'f0000000-0000-4000-8000-000000000002',
        type: 'note',
        name: 'Weekly review',
        content: '# Weekly review'
      },
      {
        id: 'd0000000-0000-4000-8000-000000000002',
        vaultId: PERSONAL_VAULT_ID,
        folderId: null,
        type: 'canvas',
        name: 'Mind map',
        content: '{"nodes":[]}'
      },
      {
        id: 'd0000000-0000-4000-8000-000000000003',
        vaultId: WORK_VAULT_ID,
        folderId: 'f0000000-0000-4000-8000-000000000003',
        type: 'note',
        name: 'Roadmap',
        content: '# Roadmap'
      },
      {
        id: 'd0000000-0000-4000-8000-000000000004',
        vaultId: WORK_VAULT_ID,
        folderId: null,
        type: 'note',
        name: 'Ideas',
        content: ''
      },
      {
        id: 'd0000000-0000-4000-8000-000000000005',
        vaultId: READING_VAULT_ID,
        folderId: null,
        type: 'note',
        name: 'Books',
        content: '- Dune'
      },
      {
        id: 'd0000000-0000-4000-8000-000000000006',
        vaultId: READING_VAULT_ID,
        folderId: null,
        type: 'canvas',
        name: 'Reading map',
        content: '{"nodes":[]}'
      }
    ],
    backlinks: [
      {
        sourceFileId: 'd0000000-0000-4000-8000-000000000001',
        targetFileId: 'd0000000-0000-4000-8000-000000000002'
      },
      {
        sourceFileId: 'd0000000-0000-4000-8000-000000000003',
        targetFileId: 'd0000000-0000-4000-8000-000000000004'
      }
    ]
  };
}

/**
 * Stores the given vault data on the device the way the app keeps it, and returns the raw stored text so a test can
 * check later that it was left exactly as it was.
 */
export function storeLocalVaultData(data: MigrationRequest): string {
  const raw = JSON.stringify(data);
  window.localStorage.setItem(LOCAL_VAULT_DATA_KEY, raw);
  return raw;
}
