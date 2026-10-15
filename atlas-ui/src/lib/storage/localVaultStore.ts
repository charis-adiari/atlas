import type { Vault, VaultStore } from './types';

interface LocalMeta {
  vaultIds: string[];
  lastOpenVaultId: string | null;
  lastVisit: string;
}

const META_KEY = 'atlas:meta';
const vaultKey = (vaultId: string) => `atlas:vaults:${vaultId}`;
const fileKey = (fileId: string) => `atlas:file:${fileId}`;

export class LocalVaultStore implements VaultStore {
  async getLastLogIn() {
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
      createdAt: Date.now().toString()
    };
    localStorage.setItem(vaultKey(vault.id), JSON.stringify(vault));
    this.openVault(vault.id);

    return vault;
  }

  async getVaults(): Promise<Vault[]> {
    let vaults: Vault[] = [];
    const meta = this.readJson<Partial<LocalMeta>>(META_KEY);

    if (meta && meta.vaultIds?.length) {
      meta.vaultIds?.forEach(id => {
        const vault = this.readJson<Partial<Vault>>(vaultKey(id));

        if (vault) vaults.push({
          id: vault.id ?? id,
          name: vault.name ?? '',
          createdAt: vault.createdAt ?? Date.now().toString()
        });
      });
    }

    return vaults;
  }

  private readJson<T>(key: string): T | null {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;

    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  private openVault(vaultId: string) {
    let meta = this.readJson<Partial<LocalMeta>>(META_KEY);

    if (meta) {
      if (meta.vaultIds?.includes(vaultId)) meta.vaultIds?.push(vaultId);
      meta.lastOpenVaultId = vaultId;
    } else {
      meta = {
        vaultIds: [vaultId],
        lastOpenVaultId: vaultId,
        lastVisit: Date.now().toString()
      };
    }

    localStorage.setItem(META_KEY, JSON.stringify(meta));
  }

  private async initMeta(lastOpenVaultId: string | null) {
    const meta: LocalMeta = { 
      vaultIds: lastOpenVaultId ? [lastOpenVaultId] : [],
      lastOpenVaultId,
      lastVisit: Date.now().toString(),
    };

    localStorage.setItem(META_KEY, JSON.stringify(meta));
  }
}
