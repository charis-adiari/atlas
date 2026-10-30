package com.musketeers.domain.vault;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/**
 * A file inside a vault, either a Markdown note or a canvas. The id is assigned by the client. Maps the files table,
 * whose schema is owned by Flyway; it is not called File so it cannot be confused with java.io.File.
 */
@Entity
@Table(name = "files")
public class VaultFile {
    @Id
    public UUID id;

    @Column(name = "vault_id", nullable = false)
    public UUID vaultId;

    @Column(name = "folder_id")
    public UUID folderId;

    @Enumerated(EnumType.STRING)
    @Column(name = "file_type_code", nullable = false)
    public FileType type;

    @Column(nullable = false)
    public String name;

    @Column(nullable = false)
    public String content;

    @Column(name = "created_at", nullable = false)
    public Instant createdAt;

    @Column(name = "last_updated_at", nullable = false)
    public Instant lastUpdatedAt;
}
