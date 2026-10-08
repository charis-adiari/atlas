import { LocalVaultStore } from "./localVaultStore";
import { VaultStore } from "./types";

const localStore = new LocalVaultStore();

export function getStore(): VaultStore {
  return localStore;
}