package com.musketeers.api.vaults.mappers;

import com.musketeers.domain.vault.Backlink;
import com.musketeers.domain.vault.Folder;
import com.musketeers.domain.vault.Vault;
import com.musketeers.domain.vault.VaultFile;
import com.musketeers.dto.migration.BacklinkDto;
import com.musketeers.dto.migration.FileDto;
import com.musketeers.dto.migration.FolderDto;
import com.musketeers.dto.migration.VaultDto;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.time.Instant;
import java.util.UUID;

@Mapper(componentModel = "cdi")
public interface MigrationMapper {
    @Mapping(target = "userId", source = "userId")
    @Mapping(target = "lastUpdatedAt", source = "now")
    Vault toVault(VaultDto dto, UUID userId, Instant now);

    @Mapping(target = "lastUpdatedAt", source = "now")
    Folder toFolder(FolderDto dto, Instant now);

    @Mapping(target = "content", source = "dto.content", defaultValue = "")
    @Mapping(target = "lastUpdatedAt", source = "now")
    VaultFile toFile(FileDto dto, Instant now);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "vaultId", source = "vaultId")
    @Mapping(target = "createdAt", source = "now")
    Backlink toBacklink(BacklinkDto dto, UUID vaultId, Instant now);
}
