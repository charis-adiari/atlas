package com.musketeers.domain.vault;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/**
 * One row means the source file links to the target file. Both files are in the vault stored on the row. Maps the
 * backlinks table, whose schema is owned by Flyway.
 */
@Entity
@Table(name = "backlinks")
public class Backlink {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @Column(name = "vault_id", nullable = false)
    public UUID vaultId;

    @Column(name = "source_file_id", nullable = false)
    public UUID sourceFileId;

    @Column(name = "target_file_id", nullable = false)
    public UUID targetFileId;

    @Column(name = "created_at", nullable = false)
    public Instant createdAt;
}
