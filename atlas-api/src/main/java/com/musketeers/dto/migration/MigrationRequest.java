package com.musketeers.dto.migration;

import jakarta.validation.Valid;

import java.util.List;

/**
 * Represent the full local payload uploaded when an anonymous user's data moves to their account. The four lists are
 * flat, mirroring the tables, so records can reference each other by id in any order. A missing list counts as empty.
 * @param vaults Local vaults
 * @param folders Local folders of those vaults
 * @param files Local files of those vaults
 * @param backlinks Local links between those files
 */
public record MigrationRequest(
        @Valid List<VaultDto> vaults,
        @Valid List<FolderDto> folders,
        @Valid List<FileDto> files,
        @Valid List<BacklinkDto> backlinks
) {
    public MigrationRequest {
        vaults = vaults == null ? List.of() : vaults;
        folders = folders == null ? List.of() : folders;
        files = files == null ? List.of() : files;
        backlinks = backlinks == null ? List.of() : backlinks;
    }
}
