/**
 * A named collection of notes, canvases and folders.
 */
export type Vault = {
  /** Unique identifier. */
  id: string;

  /** Display name. */
  name: string;

  /** Creation time, as epoch milliseconds in string form. */
  createdAt: string;

  /** Folder and file hierarchy, when loaded. */
  tree?: Tree;
};

/**
 * Hierarchy of folders and files in a {@link Vault}.
 *
 * @remarks
 * Folders and files are stored by id in flat records. Parent/child links
 * are ids that point into those records.
 */
export type Tree = {
  /** Ids of folders directly in the vault root. */
  rootFolderIds: string[];

  /** Ids of files directly in the vault root. */
  rootFileIds: string[];

  /** All folders in the vault, keyed by id. */
  folders: Record<
    string,
    {
      id: string;
      name: string;
      /** Id of the containing folder, or `null` for a root folder. */
      parentFolderId: string | null;
      childFolderIds: string[];
      childFileIds: string[];
    }
  >;

  /** All files in the vault, keyed by id. */
  files: Record<
    string,
    {
      id: string;
      name: string;
      type: 'note' | 'canvas';
      /** Id of the containing folder, or `null` for a root file. */
      folderId: string | null;
      /** Creation time, as epoch milliseconds in string form. */
      createdAt: string;
      /** Last modification time, as epoch milliseconds in string form. */
      updatedAt: string;
    }
  >;
};

/**
 * Persistence for vaults. Implemented separately for local and cloud storage.
 */
export interface VaultStore {
  /**
   * Gets the time of the user's last visit.
   * @returns The timestamp, or `null` if the user has never visited.
   */
  getLastVisit(): Promise<string | null>;

  /**
   * Records the time of the user's latest visit.
   * @param dateTime - Epoch milliseconds in string form.
   */
  setLastLogIn(dateTime: string): Promise<void>;

  /**
   * Creates a vault and marks it as the last one opened.
   * @param name - Display name for the vault.
   * @returns The newly created vault.
   */
  createVault(name?: string): Promise<Vault>;

  /**
   * Gets a summary (ID, name and createdAt) of every vault the user has.
   * @returns The vaults, or an empty array if there are none.
   */
  getVaults(): Promise<Vault[]>;
}
