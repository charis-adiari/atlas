package com.musketeers.service.migration;

import com.musketeers.dto.migration.BacklinkDto;
import com.musketeers.dto.migration.FileDto;
import com.musketeers.dto.migration.FolderDto;
import com.musketeers.dto.migration.MigrationRequest;
import com.musketeers.dto.migration.VaultDto;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/**
 * Checks that an uploaded payload is consistent with itself before anything is written. The database enforces the same
 * rules with foreign keys, but a violation there would surface as a 500; checking first gives the client a 400 that
 * names the offending record. Everything must be reachable from the payload alone: ids are unique per kind, every
 * reference points at a record in the payload, references never cross vaults, and folders never form a cycle.
 */
@ApplicationScoped
public class MigrationPayloadChecker {
    /**
     * Checks the whole payload and stops at the first problem.
     *
     * @param request the payload that passed field validation
     * @throws IllegalArgumentException if any record is inconsistent
     */
    public void check(MigrationRequest request) {
        checkNoNullEntries(request);
        Set<UUID> vaultIds = collectVaultIds(request.vaults());
        Map<UUID, FolderDto> folders = indexFolders(request.folders(), vaultIds);
        checkFolderParents(folders);
        checkNoFolderCycles(folders);
        Map<UUID, UUID> fileVaults = indexFiles(request.files(), vaultIds, folders);
        checkBacklinks(request.backlinks(), fileVaults);
    }

    /**
     * Rejects a null where a record was expected, which a JSON array such as [null] produces. Field validation skips
     * such entries, so without this check they would fail later with a NullPointerException and a 500.
     */
    private void checkNoNullEntries(MigrationRequest request) {
        rejectNulls(request.vaults(), "vaults");
        rejectNulls(request.folders(), "folders");
        rejectNulls(request.files(), "files");
        rejectNulls(request.backlinks(), "backlinks");
    }

    /**
     * Rejects one list if any of its entries is null.
     */
    private void rejectNulls(List<?> entries, String name) {
        if (entries.stream().anyMatch(Objects::isNull)) {
            throw new IllegalArgumentException("The " + name + " list contains an empty entry");
        }
    }

    /**
     * Collects the vault ids, rejecting duplicates.
     */
    private Set<UUID> collectVaultIds(List<VaultDto> vaults) {
        Set<UUID> ids = new HashSet<>();
        for (VaultDto vault : vaults) {
            if (!ids.add(vault.id())) {
                throw new IllegalArgumentException("Duplicate vault id " + vault.id());
            }
        }
        return ids;
    }

    /**
     * Indexes the folders by id, rejecting duplicates and folders in a vault that was not uploaded.
     */
    private Map<UUID, FolderDto> indexFolders(List<FolderDto> folders, Set<UUID> vaultIds) {
        Map<UUID, FolderDto> byId = new HashMap<>();
        for (FolderDto folder : folders) {
            if (byId.put(folder.id(), folder) != null) {
                throw new IllegalArgumentException("Duplicate folder id " + folder.id());
            }
            if (!vaultIds.contains(folder.vaultId())) {
                throw new IllegalArgumentException(
                        "Folder " + folder.id() + " is in vault " + folder.vaultId() + ", which was not uploaded");
            }
        }
        return byId;
    }

    /**
     * Checks that every parent folder was uploaded and is in the same vault as its child.
     */
    private void checkFolderParents(Map<UUID, FolderDto> folders) {
        for (FolderDto folder : folders.values()) {
            if (folder.parentFolderId() == null) {
                continue;
            }
            FolderDto parent = folders.get(folder.parentFolderId());
            if (parent == null) {
                throw new IllegalArgumentException(
                        "Folder " + folder.id() + " has parent " + folder.parentFolderId() + ", which was not uploaded");
            }
            if (!parent.vaultId().equals(folder.vaultId())) {
                throw new IllegalArgumentException(
                        "Folder " + folder.id() + " and its parent " + parent.id() + " are in different vaults");
            }
        }
    }

    /**
     * Checks that following parents from any folder always reaches the top level. Each walk stops as soon as it meets a
     * folder that an earlier walk already proved safe, so the whole check is linear in the number of folders. A folder
     * that is its own parent is the smallest cycle and is caught the same way. It needs every parent to exist, so it
     * runs after {@link #checkFolderParents}.
     */
    private void checkNoFolderCycles(Map<UUID, FolderDto> folders) {
        Set<UUID> safe = new HashSet<>();
        for (UUID start : folders.keySet()) {
            Set<UUID> path = new HashSet<>();
            UUID current = start;
            while (current != null && !safe.contains(current)) {
                if (!path.add(current)) {
                    throw new IllegalArgumentException("Folder " + current + " is part of a folder cycle");
                }
                current = folders.get(current).parentFolderId();
            }
            safe.addAll(path);
        }
    }

    /**
     * Indexes the files by id, rejecting duplicates, files in a vault that was not uploaded and files in a folder that
     * is missing or in another vault.
     *
     * @return the vault of each file, keyed by file id, which the backlinks are checked against
     */
    private Map<UUID, UUID> indexFiles(List<FileDto> files, Set<UUID> vaultIds, Map<UUID, FolderDto> folders) {
        Map<UUID, UUID> fileVaults = new HashMap<>();
        for (FileDto file : files) {
            if (fileVaults.put(file.id(), file.vaultId()) != null) {
                throw new IllegalArgumentException("Duplicate file id " + file.id());
            }
            if (!vaultIds.contains(file.vaultId())) {
                throw new IllegalArgumentException(
                        "File " + file.id() + " is in vault " + file.vaultId() + ", which was not uploaded");
            }
            checkFileFolder(file, folders);
        }
        return fileVaults;
    }

    /**
     * Checks that the folder of a file, if it has one, was uploaded and is in the same vault as the file.
     */
    private void checkFileFolder(FileDto file, Map<UUID, FolderDto> folders) {
        if (file.folderId() == null) {
            return;
        }
        FolderDto folder = folders.get(file.folderId());
        if (folder == null) {
            throw new IllegalArgumentException(
                    "File " + file.id() + " is in folder " + file.folderId() + ", which was not uploaded");
        }
        if (!folder.vaultId().equals(file.vaultId())) {
            throw new IllegalArgumentException(
                    "File " + file.id() + " and its folder " + folder.id() + " are in different vaults");
        }
    }

    /**
     * Checks that both ends of every backlink were uploaded and are in the same vault.
     */
    private void checkBacklinks(List<BacklinkDto> backlinks, Map<UUID, UUID> fileVaults) {
        for (BacklinkDto backlink : backlinks) {
            UUID sourceVault = fileVaults.get(backlink.sourceFileId());
            UUID targetVault = fileVaults.get(backlink.targetFileId());
            if (sourceVault == null) {
                throw new IllegalArgumentException(
                        "Backlink source file " + backlink.sourceFileId() + " was not uploaded");
            }
            if (targetVault == null) {
                throw new IllegalArgumentException(
                        "Backlink target file " + backlink.targetFileId() + " was not uploaded");
            }
            if (!sourceVault.equals(targetVault)) {
                throw new IllegalArgumentException(
                        "Backlink from " + backlink.sourceFileId() + " to " + backlink.targetFileId()
                                + " joins files in different vaults");
            }
        }
    }
}
