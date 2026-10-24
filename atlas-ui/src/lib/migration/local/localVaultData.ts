import type { MigrationRequest } from '@/types/migration';

export const LOCAL_VAULT_DATA_KEY = 'atlas.local-vault-data';
export const MIGRATION_RECORD_KEY = 'atlas.local-vault-data.migrated';
export const STORE_META_KEY = 'atlas:meta';
export const STORE_VAULT_KEY_PREFIX = 'atlas:vaults:';

const VAULT_FIELDS = ['id', 'name', 'createdAt'] as const;
const FOLDER_FIELDS = ['id', 'vaultId', 'parentFolderId', 'name', 'createdAt'] as const;
const FILE_FIELDS = ['id', 'vaultId', 'folderId', 'type', 'name', 'content', 'createdAt'] as const;
const BACKLINK_FIELDS = ['sourceFileId', 'targetFileId'] as const;
const TIMESTAMP_FIELDS: readonly string[] = ['createdAt'];

const EPOCH_MILLISECONDS = /^\d+$/;

type RawRecord = Record<string, unknown>;

/**
 * Reads the vault data kept on this device that has not been migrated to an account yet. The vaults come from the
 * local vault store, which keeps an index under atlas:meta and one entry per vault under atlas:vaults:. That store does
 * not keep folders, files or backlinks yet, so those can only come from the full-data contract documented in the
 * README, which is read as well and is the place to change once the store keeps them. If both name the same vault, the
 * contract wins. Vaults that were migrated earlier are left out together with their folders, files and backlinks. Only
 * the fields the API knows are returned, so nothing else that is stored locally can end up in an upload. Data that
 * cannot be read is treated as absent and left untouched.
 *
 * @returns the data to migrate, or null if there is no vault to migrate
 */
export function readUnmigratedVaultData(): MigrationRequest | null {
  const raw = readItem(LOCAL_VAULT_DATA_KEY);
  const contract = raw === null ? null : parseVaultData(raw);
  const data = addStoreVaults(contract ?? { vaults: [], folders: [], files: [], backlinks: [] });

  const unmigrated = excludeVaults(data, readMigratedVaultIds());
  return unmigrated.vaults.length > 0 ? unmigrated : null;
}

/**
 * Records that the vaults in the given data are on the account of the given user, so they are not offered for
 * migration again. The local data itself is left in place. Placeholder, like readUnmigratedVaultData.
 */
export function markVaultDataMigrated(userId: string, data: MigrationRequest): void {
  const vaultIds = new Set(readMigratedVaultIds());
  data.vaults.forEach((vault) => vaultIds.add(vault.id));

  const record = { userId, migratedAt: new Date().toISOString(), vaultIds: [...vaultIds] };
  writeItem(MIGRATION_RECORD_KEY, JSON.stringify(record));
}

/**
 * Adds the vaults of the local vault store that the data does not already have. A vault without a name cannot be
 * uploaded, so it is left out instead of making the whole upload fail. A vault whose creation time cannot be read gets
 * the current time, the same way the store itself fills it in.
 */
function addStoreVaults(data: MigrationRequest): MigrationRequest {
  const knownIds = new Set(data.vaults.map((vault) => vault.id));
  const added = readStoreVaultIds().flatMap((id) => {
    const stored = parseJson(readItem(`${STORE_VAULT_KEY_PREFIX}${id}`) ?? '');
    if (knownIds.has(id) || !isRecord(stored) || typeof stored.name !== 'string') {
      return [];
    }
    if (stored.name.trim() === '') {
      return [];
    }
    const createdAt = toIsoTimestamp(stored.createdAt) ?? new Date().toISOString();
    return [{ id, name: stored.name, createdAt }];
  });

  return { ...data, vaults: [...data.vaults, ...added] };
}

/**
 * Reads the ids of the vaults in the local vault store's index, ignoring an index that is damaged.
 */
function readStoreVaultIds(): string[] {
  const raw = readItem(STORE_META_KEY);
  const meta = raw === null ? null : parseJson(raw);

  if (!isRecord(meta) || !Array.isArray(meta.vaultIds)) {
    return [];
  }
  return meta.vaultIds.filter((id): id is string => typeof id === 'string');
}

/**
 * Parses the stored vault data, or returns null if it is not JSON or does not have the expected lists.
 */
function parseVaultData(raw: string): MigrationRequest | null {
  const parsed = parseJson(raw);

  if (!isRecord(parsed)) {
    return null;
  }

  const vaults = pickRecords(parsed.vaults, VAULT_FIELDS);
  const folders = pickRecords(parsed.folders, FOLDER_FIELDS);
  const files = pickRecords(parsed.files, FILE_FIELDS);
  const backlinks = pickRecords(parsed.backlinks, BACKLINK_FIELDS);

  if (vaults === null || folders === null || files === null || backlinks === null) {
    return null;
  }
  return { vaults, folders, files, backlinks } as unknown as MigrationRequest;
}

/**
 * Copies the known fields of every record in a list. A missing list counts as empty, while anything that is not a list
 * of objects makes the whole list unusable.
 */
function pickRecords(list: unknown, fields: readonly string[]): RawRecord[] | null {
  if (list === undefined) {
    return [];
  }
  if (!Array.isArray(list) || !list.every(isRecord)) {
    return null;
  }
  return list.map((item) => pickFields(item, fields));
}

/**
 * Copies the given fields that are present, turning timestamps into the ISO-8601 strings the API expects.
 */
function pickFields(item: RawRecord, fields: readonly string[]): RawRecord {
  const picked: RawRecord = {};

  for (const field of fields) {
    const value = TIMESTAMP_FIELDS.includes(field) ? toIsoTimestamp(item[field]) : item[field];
    if (value !== undefined) {
      picked[field] = value;
    }
  }
  return picked;
}

/**
 * Turns a stored timestamp into an ISO-8601 string. Epoch milliseconds are converted, whether stored as a number or as
 * the digits of one, because the API would read a bare number as seconds; anything else that is not a string is dropped, and the API then refuses the upload because every record needs a
 * creation time.
 */
function toIsoTimestamp(value: unknown): string | undefined {
  if (typeof value === 'string' && EPOCH_MILLISECONDS.test(value)) {
    return toIsoTimestamp(Number(value));
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  }
  return undefined;
}

/**
 * Removes the given vaults and everything that belongs to them.
 */
function excludeVaults(data: MigrationRequest, migratedVaultIds: string[]): MigrationRequest {
  const migrated = new Set(migratedVaultIds);
  const vaults = data.vaults.filter((vault) => !migrated.has(vault.id));
  const vaultIds = new Set(vaults.map((vault) => vault.id));
  const files = data.files.filter((file) => vaultIds.has(file.vaultId));
  const fileIds = new Set(files.map((file) => file.id));

  return {
    vaults,
    folders: data.folders.filter((folder) => vaultIds.has(folder.vaultId)),
    files,
    backlinks: data.backlinks.filter((backlink) => fileIds.has(backlink.sourceFileId))
  };
}

/**
 * Reads the ids of the vaults recorded as migrated, ignoring a record that is damaged.
 */
function readMigratedVaultIds(): string[] {
  const raw = readItem(MIGRATION_RECORD_KEY);
  const record = raw === null ? null : parseJson(raw);

  if (!isRecord(record) || !Array.isArray(record.vaultIds)) {
    return [];
  }
  return record.vaultIds.filter((id): id is string => typeof id === 'string');
}

/**
 * Parses JSON, returning undefined instead of throwing.
 */
function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

/**
 * Checks that a value is a plain object rather than null, a list or a primitive.
 */
function isRecord(value: unknown): value is RawRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Reads an item from localStorage, treating an unavailable storage as empty.
 */
function readItem(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Writes an item to localStorage, ignoring a storage that is unavailable or full.
 */
function writeItem(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    return;
  }
}
