package com.musketeers.dto.migration;

import com.musketeers.domain.vault.FileType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.UUID;

/**
 * Represent a local file being uploaded. The last updated time is not accepted, because the upload itself is the last
 * time the file was updated.
 * @param id Id the file already has locally, which it keeps on the server
 * @param vaultId Vault the file is in, which must be one of the uploaded vaults
 * @param folderId Folder the file is in, or null for the top level of the vault
 * @param type Kind of file, written as note or canvas
 * @param name Name of the file
 * @param content Markdown text for a note or serialised JSON for a canvas, empty if null
 * @param createdAt When the file was created locally
 */
public record FileDto(
        @NotNull(message = "File id is required")
        UUID id,

        @NotNull(message = "File vaultId is required")
        UUID vaultId,

        UUID folderId,

        @NotNull(message = "File type is required")
        FileType type,

        @NotBlank(message = "File name is required")
        @Size(max = 255, message = "File name is too long")
        String name,

        String content,

        @NotNull(message = "File createdAt is required")
        Instant createdAt
) {
}
