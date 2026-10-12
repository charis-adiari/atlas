package com.musketeers.dto.migration;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.UUID;

/**
 * Represent a local file being uploaded. Timestamps are kept as they were locally.
 * @param id Id the file already has locally, which it keeps on the server
 * @param vaultId Vault the file is in, which must be one of the uploaded vaults
 * @param folderId Folder the file is in, or null for the top level of the vault
 * @param type Either note or canvas
 * @param name Name of the file
 * @param content Markdown text for a note or serialised JSON for a canvas, empty if null
 * @param createdAt When the file was created locally as an ISO-8601 string, defaults to now
 * @param lastUpdatedAt When the file last changed locally as an ISO-8601 string, defaults to createdAt
 */
public record FilePayload(
        @NotNull(message = "File id is required")
        UUID id,

        @NotNull(message = "File vaultId is required")
        UUID vaultId,

        UUID folderId,

        @NotBlank(message = "File type is required")
        @Pattern(regexp = "note|canvas", message = "File type must be note or canvas")
        String type,

        @NotBlank(message = "File name is required")
        @Size(max = 255, message = "File name is too long")
        String name,

        String content,
        Instant createdAt,
        Instant lastUpdatedAt
) {
}
