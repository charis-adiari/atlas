import type { MigrationRequest } from '@/types/migration';

/**
 * Represents how much there is to migrate.
 */
export interface VaultSummary {
  vaultCount: number;
  noteCount: number;
  canvasCount: number;
}

/**
 * Counts the vaults, notes and canvases in the data.
 */
export function summarizeVaultData(data: MigrationRequest): VaultSummary {
  return {
    vaultCount: data.vaults.length,
    noteCount: data.files.filter((file) => file.type === 'note').length,
    canvasCount: data.files.filter((file) => file.type === 'canvas').length
  };
}

/**
 * Describes a count with its noun in the right number, such as "1 vault" or "3 vaults".
 */
export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/**
 * Describes a summary the way the migration prompt shows it, such as "3 vaults · 28 notes · 6 canvases".
 */
export function formatVaultSummary(summary: VaultSummary): string {
  return [
    pluralize(summary.vaultCount, 'vault', 'vaults'),
    pluralize(summary.noteCount, 'note', 'notes'),
    pluralize(summary.canvasCount, 'canvas', 'canvases')
  ].join(' · ');
}
