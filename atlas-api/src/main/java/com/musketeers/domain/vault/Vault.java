package com.musketeers.domain.vault;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/**
 * A vault, which belongs to exactly one user. The id is assigned by the client, so a vault keeps the UUID it had
 * locally when it is uploaded. Maps the vaults table, whose schema is owned by Flyway.
 */
@Entity
@Table(name = "vaults")
public class Vault {
    @Id
    public UUID id;

    @Column(name = "user_id", nullable = false)
    public UUID userId;

    @Column(nullable = false)
    public String name;

    @Column(name = "created_at", nullable = false)
    public Instant createdAt;

    @Column(name = "last_updated_at", nullable = false)
    public Instant lastUpdatedAt;
}
