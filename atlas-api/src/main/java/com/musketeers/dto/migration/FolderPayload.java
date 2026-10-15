package com.musketeers.dto.migration;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.UUID;

/**
 * Represent a local folder being uploaded. Folders can be listed in any order, a child may come before its parent.
 * @param id Id the folder already has locally, which it keeps on the server
 * @param vaultId Vault the folder is in, which must be one of the uploaded vaults
 * @param parentFolderId Folder it is nested in, or null for the top level of the vault
 * @param name Name of the folder
 * @param createdAt When the folder was created locally as an ISO-8601 string, defaults to now
 * @param lastUpdatedAt When the folder last changed locally as an ISO-8601 string, defaults to createdAt
 */
public record FolderPayload(
        @NotNull(message = "Folder id is required")
        UUID id,

        @NotNull(message = "Folder vaultId is required")
        UUID vaultId,

        UUID parentFolderId,

        @NotBlank(message = "Folder name is required")
        @Size(max = 255, message = "Folder name is too long")
        String name,

        Instant createdAt,
        Instant lastUpdatedAt
) {
}
