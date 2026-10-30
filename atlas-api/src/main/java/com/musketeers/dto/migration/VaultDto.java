package com.musketeers.dto.migration;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.UUID;

/**
 * Represent a local vault being uploaded. It never carries an owner: the owner is always the signed-in user. The last
 * updated time is not accepted either, because the upload itself is the last time the vault was updated.
 * @param id Id the vault already has locally, which it keeps on the server
 * @param name Name of the vault
 * @param createdAt When the vault was created locally
 */
public record VaultDto(
        @NotNull(message = "Vault id is required")
        UUID id,

        @NotBlank(message = "Vault name is required")
        @Size(max = 255, message = "Vault name is too long")
        String name,

        @NotNull(message = "Vault createdAt is required")
        Instant createdAt
) {
}
