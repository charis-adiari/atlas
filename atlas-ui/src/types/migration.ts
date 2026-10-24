/**
 * Represents a local vault being uploaded. Mirrors the API's VaultDto. The creation time is an ISO-8601 string and is
 * required; the API sets the last updated time itself, to the moment of the migration.
 */
export interface VaultPayload {
  id: string;
  name: string;
  createdAt: string;
}

/**
 * Represents a local folder being uploaded. Mirrors the API's FolderDto.
 */
export interface FolderPayload {
  id: string;
  vaultId: string;
  parentFolderId?: string | null;
  name: string;
  createdAt: string;
}

/**
 * Represents a local file being uploaded. Mirrors the API's FileDto; the content is Markdown for a note and
 * serialised JSON for a canvas.
 */
export interface FilePayload {
  id: string;
  vaultId: string;
  folderId?: string | null;
  type: 'note' | 'canvas';
  name: string;
  content?: string;
  createdAt: string;
}

/**
 * Represents a local link between two files being uploaded. Mirrors the API's BacklinkDto.
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
