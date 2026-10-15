/**
 * Represents a local vault being uploaded. Mirrors the API's VaultPayload; timestamps are ISO-8601 strings.
 */
export interface VaultPayload {
  id: string;
  name: string;
  createdAt?: string;
  lastUpdatedAt?: string;
}

/**
 * Represents a local folder being uploaded. Mirrors the API's FolderPayload.
 */
export interface FolderPayload {
  id: string;
  vaultId: string;
  parentFolderId?: string | null;
  name: string;
  createdAt?: string;
  lastUpdatedAt?: string;
}

/**
 * Represents a local file being uploaded. Mirrors the API's FilePayload; the content is Markdown for a note and
 * serialised JSON for a canvas.
 */
export interface FilePayload {
  id: string;
  vaultId: string;
  folderId?: string | null;
  type: 'note' | 'canvas';
  name: string;
  content?: string;
  createdAt?: string;
  lastUpdatedAt?: string;
}

/**
 * Represents a local link between two files being uploaded. Mirrors the API's BacklinkPayload.
 */
export interface BacklinkPayload {
  sourceFileId: string;
  targetFileId: string;
}

/**
 * Represents the full local payload sent to the migrate endpoint. The lists are flat and may be in any order. It is
 * also the shape local vault data is kept in, so what is stored is what is sent.
 */
export interface MigrationRequest {
  vaults: VaultPayload[];
  folders: FolderPayload[];
  files: FilePayload[];
  backlinks: BacklinkPayload[];
}

/**
 * Represents the migrate endpoint's answer: how many records of each kind were stored.
 */
export interface MigrationResponse {
  vaults: number;
  folders: number;
  files: number;
  backlinks: number;
}
