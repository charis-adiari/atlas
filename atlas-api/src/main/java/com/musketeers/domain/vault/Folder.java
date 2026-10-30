package com.musketeers.domain.vault;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/**
 * A folder inside a vault. Folders nest through the nullable parent id, where null means the top level of the vault.
 * The id is assigned by the client. Maps the folders table, whose schema is owned by Flyway.
 */
@Entity
@Table(name = "folders")
public class Folder {
    @Id
    public UUID id;

    @Column(name = "vault_id", nullable = false)
    public UUID vaultId;

    @Column(name = "parent_folder_id")
    public UUID parentFolderId;

    @Column(nullable = false)
    public String name;

    @Column(name = "created_at", nullable = false)
    public Instant createdAt;

    @Column(name = "last_updated_at", nullable = false)
    public Instant lastUpdatedAt;
}
