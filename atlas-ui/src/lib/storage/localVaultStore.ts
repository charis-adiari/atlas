import type { Vault, VaultStore } from './types';

/** Index of vaults and visit state, stored under {@link META_KEY}. */
interface LocalMeta {
  /** Ids of all vaults, used to look up each vault's own entry. */
  vaultIds: string[];

  /** Id of the vault opened most recently, or `null` if none yet. */
  lastOpenVaultId: string | null;

  /** Time of the last visit, as epoch milliseconds in string form. */
  lastVisit: string;
}

/** `localStorage` key holding the {@link LocalMeta} record. */
const META_KEY = 'atlas:meta';
/** Builds the `localStorage` key for a vault. */
const vaultKey = (vaultId: string) => `atlas:vaults:${vaultId}`;

/**
 * {@link VaultStore} backed by the browser's `localStorage`.
 *
 * @remarks
 * Browser-only: methods throw if called during server rendering, so call
 * them from effects or event handlers.
 */
export class LocalVaultStore implements VaultStore {
  async getLastVisit() {
    const meta = this.readJson<Partial<LocalMeta>>(META_KEY);

    if (meta) return meta.lastVisit ?? null;
    else return null;
  }

  async setLastLogIn(dateTime: string) {
    let meta = this.readJson<Partial<LocalMeta>>(META_KEY);

    if (meta) meta.lastVisit = dateTime;
    else {
      meta = {
        vaultIds: [],
        lastOpenVaultId: null,
        lastVisit: dateTime
      };
    }

    localStorage.setItem(META_KEY, JSON.stringify(meta));
  }

  async createVault(name = 'New Vault') {
    const vault: Vault = {
      id: crypto.randomUUID(),
      name,
      createdAt: new Date(Date.now()).toISOString()
    };
    localStorage.setItem(vaultKey(vault.id), JSON.stringify(vault));
    this.openVault(vault.id);

    return vault;
  }

  async getVaults(): Promise<Vault[]> {
    const vaults: Vault[] = [];
    const meta = this.readJson<Partial<LocalMeta>>(META_KEY);

    if (meta && meta.vaultIds?.length) {
      meta.vaultIds?.forEach((id) => {
        const vault = this.readJson<Partial<Vault>>(vaultKey(id));

        if (vault)
          vaults.push({
            id: vault.id ?? id,
            name: vault.name ?? '',
            createdAt: vault.createdAt ?? new Date(Date.now()).toISOString()
          });
      });
    }

    return vaults;
  }

  /**
   * Reads and parses a JSON value from `localStorage`.
   * @returns The parsed value, or `null` if the key is missing or the stored text is not valid JSON.
   */
  private readJson<T>(key: string): T | null {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;

    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  /**
   * Adds a vault to the index and records it as the last one opened.
   * Creates the index if it does not exist yet.
   */
  private openVault(vaultId: string) {
    let meta = this.readJson<Partial<LocalMeta>>(META_KEY);

    if (meta) {
      if (!meta.vaultIds?.includes(vaultId)) meta.vaultIds?.push(vaultId);
      meta.lastOpenVaultId = vaultId;
    } else {
      meta = {
        vaultIds: [vaultId],
        lastOpenVaultId: vaultId,
        lastVisit: new Date(Date.now()).toISOString()
      };
    }

    localStorage.setItem(META_KEY, JSON.stringify(meta));
  }
}
