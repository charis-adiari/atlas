package com.musketeers.dto.migration;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.UUID;

/**
 * Represent a local vault being uploaded. It never carries an owner: the owner is always the signed-in user.
 * @param id Id the vault already has locally, which it keeps on the server
 * @param name Name of the vault
 * @param createdAt When the vault was created locally as an ISO-8601 string, defaults to now
 * @param lastUpdatedAt When the vault last changed locally as an ISO-8601 string, defaults to createdAt
 */
public record VaultPayload(
        @NotNull(message = "Vault id is required")
        UUID id,

        @NotBlank(message = "Vault name is required")
        @Size(max = 255, message = "Vault name is too long")
        String name,

        Instant createdAt,
        Instant lastUpdatedAt
) {
}
