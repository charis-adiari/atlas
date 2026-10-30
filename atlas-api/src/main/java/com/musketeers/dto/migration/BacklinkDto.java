package com.musketeers.dto.migration;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/**
 * Represent a local link between two files being uploaded. The vault is taken from the source file.
 * @param sourceFileId File that contains the link
 * @param targetFileId File that the link points to, which must be in the same vault as the source
 */
public record BacklinkDto(
        @NotNull(message = "Backlink sourceFileId is required")
        UUID sourceFileId,

        @NotNull(message = "Backlink targetFileId is required")
        UUID targetFileId
) {
}
