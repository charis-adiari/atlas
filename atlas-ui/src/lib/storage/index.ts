import { LocalVaultStore } from './localVaultStore';
import { VaultStore } from './types';

const localStore = new LocalVaultStore();

/**
 * Gets a cloud storage implementation of VaultStore if the user is logged in. Otherwise, gets a local storage implementation.
 * @returns An instance of {@link VaultStore}
 */
export function getStore(): VaultStore {
  return localStore;
}
