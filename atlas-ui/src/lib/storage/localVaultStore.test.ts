import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalVaultStore } from './localVaultStore';

const META_KEY = 'atlas:meta';
const VAULT_KEY_PREFIX = 'atlas:vaults:';
const NOW = new Date('2026-11-14T10:20:00.000Z');

beforeEach(() => {
  window.localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  window.localStorage.clear();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('LocalVaultStore', () => {
  it('returns null when no previous visit is stored', async () => {
    // Arrange
    const store = new LocalVaultStore();

    // Act
    const lastVisit = await store.getLastVisit();

    // Assert
    expect(lastVisit).toBeNull();
  });

  it('records a visit without losing the existing vault index', async () => {
    // Arrange
    const store = new LocalVaultStore();
    window.localStorage.setItem(
      META_KEY,
      JSON.stringify({
        vaultIds: ['vault-1'],
        lastOpenVaultId: 'vault-1',
        lastVisit: '2026-01-01T00:00:00.000Z'
      })
    );

    // Act
    await store.setLastLogIn('2026-11-14T10:20:00.000Z');

    // Assert
    expect(JSON.parse(window.localStorage.getItem(META_KEY) ?? 'null')).toEqual({
      vaultIds: ['vault-1'],
      lastOpenVaultId: 'vault-1',
      lastVisit: '2026-11-14T10:20:00.000Z'
    });
    await expect(store.getLastVisit()).resolves.toBe('2026-11-14T10:20:00.000Z');
  });

  it('initializes visit metadata when recording the first visit', async () => {
    // Arrange
    const store = new LocalVaultStore();

    // Act
    await store.setLastLogIn('2026-11-14T10:20:00.000Z');

    // Assert
    expect(JSON.parse(window.localStorage.getItem(META_KEY) ?? 'null')).toEqual({
      vaultIds: [],
      lastOpenVaultId: null,
      lastVisit: '2026-11-14T10:20:00.000Z'
    });
  });

  it('creates a named vault and records it as the last opened vault', async () => {
    // Arrange
    const store = new LocalVaultStore();
    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue('vault-1');

    // Act
    const vault = await store.createVault('Personal');

    // Assert
    expect(vault).toEqual({
      id: 'vault-1',
      name: 'Personal',
      createdAt: NOW.toISOString()
    });
    expect(window.localStorage.getItem(`${VAULT_KEY_PREFIX}vault-1`)).toBe(JSON.stringify(vault));
    expect(JSON.parse(window.localStorage.getItem(META_KEY) ?? 'null')).toEqual({
      vaultIds: ['vault-1'],
      lastOpenVaultId: 'vault-1',
      lastVisit: NOW.toISOString()
    });
  });

  it('uses the default vault name and avoids duplicate ids in the index', async () => {
    // Arrange
    const store = new LocalVaultStore();
    window.localStorage.setItem(
      META_KEY,
      JSON.stringify({
        vaultIds: ['vault-1'],
        lastOpenVaultId: null,
        lastVisit: '2026-01-01T00:00:00.000Z'
      })
    );
    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue('vault-1');

    // Act
    const vault = await store.createVault();

    // Assert
    expect(vault.name).toBe('New Vault');
    expect(JSON.parse(window.localStorage.getItem(META_KEY) ?? 'null')).toEqual({
      vaultIds: ['vault-1'],
      lastOpenVaultId: 'vault-1',
      lastVisit: '2026-01-01T00:00:00.000Z'
    });
  });

  it('returns no vaults when the index is missing or invalid', async () => {
    // Arrange
    const store = new LocalVaultStore();

    // Act
    const vaultsWithoutIndex = await store.getVaults();
    window.localStorage.setItem(META_KEY, '{not json');
    const vaultsWithInvalidIndex = await store.getVaults();

    // Assert
    expect(vaultsWithoutIndex).toEqual([]);
    expect(vaultsWithInvalidIndex).toEqual([]);
  });

  it('returns indexed vaults and skips missing or damaged entries', async () => {
    // Arrange
    const store = new LocalVaultStore();
    window.localStorage.setItem(
      META_KEY,
      JSON.stringify({
        vaultIds: ['vault-1', 'missing', 'damaged', 'partial'],
        lastOpenVaultId: 'vault-1',
        lastVisit: NOW.toISOString()
      })
    );
    window.localStorage.setItem(
      `${VAULT_KEY_PREFIX}vault-1`,
      JSON.stringify({
        id: 'vault-1',
        name: 'Personal',
        createdAt: '2026-01-01T00:00:00.000Z'
      })
    );
    window.localStorage.setItem(`${VAULT_KEY_PREFIX}damaged`, '{not json');
    window.localStorage.setItem(`${VAULT_KEY_PREFIX}partial`, JSON.stringify({}));

    // Act
    const vaults = await store.getVaults();

    // Assert
    expect(vaults).toEqual([
      {
        id: 'vault-1',
        name: 'Personal',
        createdAt: '2026-01-01T00:00:00.000Z'
      },
      {
        id: 'partial',
        name: '',
        createdAt: NOW.toISOString()
      }
    ]);
  });
});
