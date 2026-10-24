import { describe, expect, it } from 'vitest';
import type { MigrationRequest } from '@/types/migration';
import { formatVaultSummary, pluralize, summarizeVaultData } from './vaultSummary';

const DATA: MigrationRequest = {
  vaults: [
    { id: 'v1', name: 'Personal', createdAt: '2026-01-01T09:00:00Z' },
    { id: 'v2', name: 'Work', createdAt: '2026-01-01T09:00:00Z' }
  ],
  folders: [],
  files: [
    { id: 'n1', vaultId: 'v1', type: 'note', name: 'One', createdAt: '2026-01-01T09:00:00Z' },
    { id: 'n2', vaultId: 'v1', type: 'note', name: 'Two', createdAt: '2026-01-01T09:00:00Z' },
    { id: 'c1', vaultId: 'v2', type: 'canvas', name: 'Map', createdAt: '2026-01-01T09:00:00Z' }
  ],
  backlinks: []
};

describe('summarizeVaultData', () => {
  it('counts vaults, notes and canvases', () => {
    // Arrange
    const data = DATA;

    // Act
    const summary = summarizeVaultData(data);

    // Assert
    expect(summary).toEqual({ vaultCount: 2, noteCount: 2, canvasCount: 1 });
  });
});

describe('pluralize', () => {
  it.each([
    [0, '0 vaults'],
    [1, '1 vault'],
    [2, '2 vaults']
  ])('writes %i as "%s"', (count, expected) => {
    // Arrange
    const noun = ['vault', 'vaults'] as const;

    // Act
    const text = pluralize(count, noun[0], noun[1]);

    // Assert
    expect(text).toBe(expected);
  });
});

describe('formatVaultSummary', () => {
  it('joins the counts the way the prompt shows them', () => {
    // Arrange
    const summary = { vaultCount: 3, noteCount: 28, canvasCount: 6 };

    // Act
    const text = formatVaultSummary(summary);

    // Assert
    expect(text).toBe('3 vaults · 28 notes · 6 canvases');
  });

  it('uses the singular for a count of one', () => {
    // Arrange
    const summary = { vaultCount: 1, noteCount: 1, canvasCount: 1 };

    // Act
    const text = formatVaultSummary(summary);

    // Assert
    expect(text).toBe('1 vault · 1 note · 1 canvas');
  });
});
