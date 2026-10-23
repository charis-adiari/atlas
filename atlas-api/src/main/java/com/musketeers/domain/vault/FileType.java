package com.musketeers.domain.vault;

/**
 * The kinds of file a vault can hold. Each constant has a matching row in the file_types table, so a new kind needs
 * both a constant here and a row added by a migration.
 */
public enum FileType {
    NOTE,
    CANVAS
}
