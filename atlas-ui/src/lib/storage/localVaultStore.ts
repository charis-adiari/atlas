import type { Vault, VaultStore } from "./types";

interface LocalMeta {
  vaultIds: Set<string>;
  lastOpenVaultId: string | null;
  lastLogIn: string;
}

const META_KEY = "atlas:meta";
const vaultKey = (vaultId: string) => `atlas:vaults:${vaultId}`;
const fileKey = (fileId: string) => `atlas:file:${fileId}`;

export class LocalVaultStore implements VaultStore {
  async getLastLogIn() {
    const meta = this.readJson<Partial<LocalMeta>>(META_KEY);

    if (meta) return meta.lastLogIn ?? null;
    else return null;
  }

  async setLastLogIn(dateTime: string) {
    let meta = this.readJson<Partial<LocalMeta>>(META_KEY);

    if (meta)
      meta.lastLogIn = dateTime;
    else {
      meta = {
        vaultIds: new Set(),
        lastOpenVaultId: null,
        lastLogIn: dateTime
      };
    }

    localStorage.setItem(META_KEY, JSON.stringify(meta));
  }

  async createVault(name = "New Vault") {
    const vault: Vault = {
      id: crypto.randomUUID(),
      name,
      createdAt: Date.now().toString(),
    };
    localStorage.setItem(vaultKey(vault.id), JSON.stringify(vault));
    this.openVault(vault.id);
    
    return vault;
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
      meta.vaultIds?.add(vaultId);
      meta.lastOpenVaultId = vaultId;
    }
    else {
      meta = {
        vaultIds: new Set(vaultId),
        lastOpenVaultId: vaultId,
        lastLogIn: Date.now().toString()
      };
    }

    localStorage.setItem(META_KEY, JSON.stringify(meta));
  }
}