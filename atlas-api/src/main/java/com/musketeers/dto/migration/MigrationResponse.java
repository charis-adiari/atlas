package com.musketeers.dto.migration;

/**
 * Represent a migration response, the number of records stored for the user
 * @param vaults Number of vaults stored
 * @param folders Number of folders stored
 * @param files Number of files stored
 * @param backlinks Number of backlinks stored, not counting duplicates in the request
 */
public record MigrationResponse(
        int vaults,
        int folders,
        int files,
        int backlinks
) {
}
