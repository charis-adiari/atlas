import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MigrationRequest } from '@/types/migration';
import {
  LOCAL_VAULT_DATA_KEY,
  MIGRATION_RECORD_KEY,
  STORE_META_KEY,
  STORE_VAULT_KEY_PREFIX,
  markVaultDataMigrated,
  readUnmigratedVaultData
} from './localVaultData';

const VAULT_A = 'a0000000-0000-4000-8000-000000000001';
const VAULT_B = 'b0000000-0000-4000-8000-000000000002';

const DATA: MigrationRequest = {
  vaults: [
    { id: VAULT_A, name: 'Personal', createdAt: '2026-01-01T00:00:00Z' },
    { id: VAULT_B, name: 'Work ideas', createdAt: '2026-01-01T09:00:00Z' }
  ],
  folders: [
    {
      id: 'f1',
      vaultId: VAULT_A,
      parentFolderId: null,
      name: 'Inbox',
      createdAt: '2026-01-01T09:00:00Z'
    }
  ],
  files: [
    {
      id: 'n1',
      vaultId: VAULT_A,
      folderId: 'f1',
      type: 'note',
      name: 'Weekly review',
      content: '# Hi',
      createdAt: '2026-01-01T09:00:00Z'
    },
    {
      id: 'n2',
      vaultId: VAULT_B,
      folderId: null,
      type: 'canvas',
      name: 'Mind map',
      content: '{}',
      createdAt: '2026-01-01T09:00:00Z'
    }
  ],
  backlinks: [{ sourceFileId: 'n1', targetFileId: 'n1' }]
};

function store(value: unknown): void {
  window.localStorage.setItem(LOCAL_VAULT_DATA_KEY, JSON.stringify(value));
}

function storeVault(id: string, entry: unknown): void {
  window.localStorage.setItem(`${STORE_VAULT_KEY_PREFIX}${id}`, JSON.stringify(entry));
}

function storeIndex(vaultIds: unknown): void {
  window.localStorage.setItem(
    STORE_META_KEY,
    JSON.stringify({ vaultIds, lastOpenVaultId: null, lastVisit: '2026-01-01T00:00:00.000Z' })
  );
}

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe('readUnmigratedVaultData', () => {
  it('returns null when nothing is stored', () => {
    // Arrange
    window.localStorage.clear();

    // Act
    const data = readUnmigratedVaultData();

    // Assert
    expect(data).toBeNull();
  });

  it('reads the vaults, folders, files and backlinks that are stored', () => {
    // Arrange
    store(DATA);

    // Act
    const data = readUnmigratedVaultData();

    // Assert
    expect(data).toEqual(DATA);
  });

  it('counts a missing list as empty', () => {
    // Arrange
    store({ vaults: [{ id: VAULT_A, name: 'Personal', createdAt: '2026-01-01T09:00:00Z' }] });

    // Act
    const data = readUnmigratedVaultData();

    // Assert
    expect(data).toEqual({
      vaults: [{ id: VAULT_A, name: 'Personal', createdAt: '2026-01-01T09:00:00Z' }],
      folders: [],
      files: [],
      backlinks: []
    });
  });

  it.each([
    ['text that is not JSON', 'not json'],
    ['a list instead of an object', '[]'],
    ['null', 'null'],
    ['a vault list that is not a list', '{"vaults":{}}'],
    ['a vault that is not an object', '{"vaults":["x"]}'],
    ['a file list that is not a list', '{"vaults":[{"id":"v","name":"n"}],"files":"x"}']
  ])('returns null for %s and leaves it stored', (_description, raw) => {
    // Arrange
    window.localStorage.setItem(LOCAL_VAULT_DATA_KEY, raw);

    // Act
    const data = readUnmigratedVaultData();

    // Assert
    expect(data).toBeNull();
    expect(window.localStorage.getItem(LOCAL_VAULT_DATA_KEY)).toBe(raw);
  });

  it('returns null when there are files but no vault', () => {
    // Arrange
    store({ vaults: [], files: DATA.files });

    // Act
    const data = readUnmigratedVaultData();

    // Assert
    expect(data).toBeNull();
  });

  it('keeps only the fields the API knows', () => {
    // Arrange
    store({
      vaults: [
        {
          id: VAULT_A,
          name: 'Personal',
          createdAt: '2026-01-01T09:00:00Z',
          lastUpdatedAt: '2026-01-02T09:00:00Z',
          accessToken: 'secret',
          uiState: { open: true }
        }
      ]
    });

    // Act
    const data = readUnmigratedVaultData();

    // Assert
    expect(data?.vaults).toEqual([
      { id: VAULT_A, name: 'Personal', createdAt: '2026-01-01T09:00:00Z' }
    ]);
  });

  it('turns epoch milliseconds into ISO-8601 and drops a creation time it cannot read', () => {
    // Arrange
    store({
      vaults: [
        { id: VAULT_A, name: 'A', createdAt: 1_767_225_600_000 },
        { id: VAULT_B, name: 'B', createdAt: Number.NaN }
      ]
    });

    // Act
    const data = readUnmigratedVaultData();

    // Assert
    expect(data?.vaults).toEqual([
      { id: VAULT_A, name: 'A', createdAt: '2026-01-01T00:00:00.000Z' },
      { id: VAULT_B, name: 'B' }
    ]);
  });

  it('treats an unreadable storage as empty', () => {
    // Arrange
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Denied', 'SecurityError');
    });

    // Act
    const data = readUnmigratedVaultData();

    // Assert
    expect(data).toBeNull();
  });
});

describe('readUnmigratedVaultData with the local vault store', () => {
  it('offers the vaults of the store, with the fields the API knows', () => {
    // Arrange
    storeIndex([VAULT_A, VAULT_B]);
    storeVault(VAULT_A, {
      id: VAULT_A,
      name: 'Personal',
      createdAt: '2026-01-01T09:00:00.000Z',
      tree: {}
    });
    storeVault(VAULT_B, { id: VAULT_B, name: 'Work', createdAt: '2026-02-01T09:00:00.000Z' });

    // Act
    const data = readUnmigratedVaultData();

    // Assert
    expect(data).toEqual({
      vaults: [
        { id: VAULT_A, name: 'Personal', createdAt: '2026-01-01T09:00:00.000Z' },
        { id: VAULT_B, name: 'Work', createdAt: '2026-02-01T09:00:00.000Z' }
      ],
      folders: [],
      files: [],
      backlinks: []
    });
  });

  it('turns a creation time kept as the digits of epoch milliseconds into ISO-8601', () => {
    // Arrange
    storeIndex([VAULT_A]);
    storeVault(VAULT_A, { id: VAULT_A, name: 'Personal', createdAt: '1767225600000' });

    // Act
    const data = readUnmigratedVaultData();

    // Assert
    expect(data?.vaults[0].createdAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('gives a vault whose creation time is missing the current time', () => {
    // Arrange
    storeIndex([VAULT_A]);
    storeVault(VAULT_A, { id: VAULT_A, name: 'Personal' });

    // Act
    const data = readUnmigratedVaultData();

    // Assert
    expect(Number.isNaN(Date.parse(data?.vaults[0].createdAt ?? ''))).toBe(false);
  });

  it('leaves out vaults that cannot be uploaded: no entry, damaged entry or no name', () => {
    // Arrange
    storeIndex([
      VAULT_A,
      VAULT_B,
      'c0000000-0000-4000-8000-000000000003',
      'd0000000-0000-4000-8000-000000000004'
    ]);
    window.localStorage.setItem(`${STORE_VAULT_KEY_PREFIX}${VAULT_A}`, '{not json');
    storeVault(VAULT_B, { id: VAULT_B, name: '   ' });
    storeVault('c0000000-0000-4000-8000-000000000003', {
      id: 'c0000000-0000-4000-8000-000000000003'
    });

    // Act
    const data = readUnmigratedVaultData();

    // Assert
    expect(data).toBeNull();
  });

  it.each([['{not json'], [JSON.stringify({ vaultIds: 'nope' })], [JSON.stringify([])]])(
    'treats a damaged index (%s) as having no vaults',
    (index) => {
      // Arrange
      window.localStorage.setItem(STORE_META_KEY, index);
      storeVault(VAULT_A, { id: VAULT_A, name: 'Personal' });

      // Act
      const data = readUnmigratedVaultData();

      // Assert
      expect(data).toBeNull();
    }
  );

  it('adds store vaults to the full data without repeating a vault both have', () => {
    // Arrange
    store({ ...DATA, vaults: [DATA.vaults[0]] });
    storeIndex([VAULT_A, VAULT_B]);
    storeVault(VAULT_A, {
      id: VAULT_A,
      name: 'Renamed in the store',
      createdAt: '2026-05-01T00:00:00Z'
    });
    storeVault(VAULT_B, { id: VAULT_B, name: 'Work ideas', createdAt: '2026-01-01T09:00:00Z' });

    // Act
    const data = readUnmigratedVaultData();

    // Assert
    expect(data?.vaults.map((vault) => vault.name)).toEqual(['Personal', 'Work ideas']);
    expect(data?.files).toHaveLength(2);
  });

  it('still reads the store when the full data is damaged', () => {
    // Arrange
    window.localStorage.setItem(LOCAL_VAULT_DATA_KEY, '{not json');
    storeIndex([VAULT_A]);
    storeVault(VAULT_A, { id: VAULT_A, name: 'Personal', createdAt: '2026-01-01T09:00:00.000Z' });

    // Act
    const data = readUnmigratedVaultData();

    // Assert
    expect(data?.vaults).toHaveLength(1);
  });

  it('stops offering a store vault once it is recorded as migrated', () => {
    // Arrange
    storeIndex([VAULT_A, VAULT_B]);
    storeVault(VAULT_A, { id: VAULT_A, name: 'Personal', createdAt: '2026-01-01T09:00:00.000Z' });
    storeVault(VAULT_B, { id: VAULT_B, name: 'Work', createdAt: '2026-01-01T09:00:00.000Z' });
    const offered = readUnmigratedVaultData();
    markVaultDataMigrated('user-1', {
      ...(offered as MigrationRequest),
      vaults: [offered!.vaults[0]]
    });

    // Act
    const data = readUnmigratedVaultData();

    // Assert
    expect(data?.vaults.map((vault) => vault.id)).toEqual([VAULT_B]);
  });
});

describe('markVaultDataMigrated', () => {
  it('records who the vaults were migrated for and when', () => {
    // Arrange
    store(DATA);

    // Act
    markVaultDataMigrated('user-1', DATA);

    // Assert
    const record = JSON.parse(window.localStorage.getItem(MIGRATION_RECORD_KEY) ?? 'null');
    expect(record.userId).toBe('user-1');
    expect(record.vaultIds).toEqual([VAULT_A, VAULT_B]);
    expect(Number.isNaN(Date.parse(record.migratedAt))).toBe(false);
  });

  it('leaves the local data in place', () => {
    // Arrange
    store(DATA);
    const before = window.localStorage.getItem(LOCAL_VAULT_DATA_KEY);

    // Act
    markVaultDataMigrated('user-1', DATA);

    // Assert
    expect(window.localStorage.getItem(LOCAL_VAULT_DATA_KEY)).toBe(before);
  });

  it('stops offering the vaults it recorded', () => {
    // Arrange
    store(DATA);

    // Act
    markVaultDataMigrated('user-1', DATA);

    // Assert
    expect(readUnmigratedVaultData()).toBeNull();
  });

  it('still offers vaults added after the migration, without the migrated ones', () => {
    // Arrange
    store(DATA);
    markVaultDataMigrated('user-1', DATA);
    const newVault = 'c0000000-0000-4000-8000-000000000003';
    store({
      ...DATA,
      vaults: [
        ...DATA.vaults,
        { id: newVault, name: 'Reading list', createdAt: '2026-01-01T09:00:00Z' }
      ],
      files: [
        ...DATA.files,
        {
          id: 'n3',
          vaultId: newVault,
          type: 'note',
          name: 'Books',
          createdAt: '2026-01-01T09:00:00Z'
        }
      ]
    });

    // Act
    const data = readUnmigratedVaultData();

    // Assert
    expect(data?.vaults).toEqual([
      { id: newVault, name: 'Reading list', createdAt: '2026-01-01T09:00:00Z' }
    ]);
    expect(data?.files).toEqual([
      {
        id: 'n3',
        vaultId: newVault,
        type: 'note',
        name: 'Books',
        createdAt: '2026-01-01T09:00:00Z'
      }
    ]);
    expect(data?.folders).toEqual([]);
    expect(data?.backlinks).toEqual([]);
  });

  it('keeps the earlier record when more vaults are migrated later', () => {
    // Arrange
    markVaultDataMigrated('user-1', { ...DATA, vaults: [DATA.vaults[0]] });

    // Act
    markVaultDataMigrated('user-1', { ...DATA, vaults: [DATA.vaults[1]] });

    // Assert
    const record = JSON.parse(window.localStorage.getItem(MIGRATION_RECORD_KEY) ?? 'null');
    expect(record.vaultIds).toEqual([VAULT_A, VAULT_B]);
  });

  it('ignores a damaged record', () => {
    // Arrange
    store(DATA);
    window.localStorage.setItem(MIGRATION_RECORD_KEY, '{"vaultIds":"nope"}');

    // Act
    const data = readUnmigratedVaultData();

    // Assert
    expect(data?.vaults).toHaveLength(2);
  });

  it('does not throw when the browser refuses to store the record', () => {
    // Arrange
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });

    // Act
    const mark = () => markVaultDataMigrated('user-1', DATA);

    // Assert
    expect(mark).not.toThrow();
  });
});
