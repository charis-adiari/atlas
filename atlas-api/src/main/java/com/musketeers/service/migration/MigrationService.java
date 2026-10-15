package com.musketeers.service.migration;

import com.musketeers.domain.vault.Backlink;
import com.musketeers.domain.vault.Folder;
import com.musketeers.domain.vault.Vault;
import com.musketeers.domain.vault.VaultFile;
import com.musketeers.dto.migration.BacklinkPayload;
import com.musketeers.dto.migration.FilePayload;
import com.musketeers.dto.migration.FolderPayload;
import com.musketeers.dto.migration.MigrationRequest;
import com.musketeers.dto.migration.MigrationResponse;
import com.musketeers.dto.migration.VaultPayload;
import com.musketeers.exception.MigrationConflictException;
import com.musketeers.repository.MigrationRepository;
import com.musketeers.repository.UserRepository;
import com.musketeers.util.SqlErrors;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;

import java.time.Instant;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Moves an anonymous user's local data into their account
 */
@ApplicationScoped
public class MigrationService {
    private final UserRepository userRepository;
    private final MigrationRepository migrationRepository;
    private final MigrationPayloadChecker checker;

    public MigrationService(
            UserRepository userRepository,
            MigrationRepository migrationRepository,
            MigrationPayloadChecker checker
    ) {
        this.userRepository = userRepository;
        this.migrationRepository = migrationRepository;
        this.checker = checker;
    }

    /**
     * Stores the whole payload for the user in a single transaction, so either every vault, folder, file and backlink
     * is saved or none of them is. Every record is owned by the given user, whatever the payload says, and keeps the
     * id and timestamps it had locally. The user id must come from the verified token, never from the request.
     *
     * @param userId id of the signed-in user
     * @param request the local payload
     * @return how many records of each kind were stored
     * @throws EntityNotFoundException if the user no longer exists
     * @throws com.musketeers.exception.InvalidMigrationPayloadException if the payload contradicts itself
     * @throws MigrationConflictException if some of the ids are already in use
     */
    @Transactional
    public MigrationResponse migrate(UUID userId, MigrationRequest request) {
        if (userRepository.findById(userId) == null) {
            throw new EntityNotFoundException("User not found");
        }
        checker.check(request);

        Instant now = Instant.now();
        List<Vault> vaults = toVaults(userId, request.vaults(), now);
        List<Folder> folders = toFolders(request.folders(), now);
        List<VaultFile> files = toFiles(request.files(), now);
        List<Backlink> backlinks = toBacklinks(request.backlinks(), request.files(), now);

        insert(vaults, folders, files, backlinks);

        return new MigrationResponse(vaults.size(), folders.size(), files.size(), backlinks.size());
    }

    /**
     * Writes everything, translating a clash with ids that already exist into a conflict. The flush happens here so a
     * clash surfaces inside this method instead of at commit time, and the whole transaction then rolls back.
     *
     * @throws MigrationConflictException if the database rejected an id as already in use
     */
    private void insert(List<Vault> vaults, List<Folder> folders, List<VaultFile> files, List<Backlink> backlinks) {
        try {
            migrationRepository.insertAll(vaults, folders, files, backlinks);
        } catch (RuntimeException e) {
            if (SqlErrors.isUniqueViolation(e)) {
                throw new MigrationConflictException();
            }
            throw e;
        }
    }

    /**
     * Maps the vault payloads to entities owned by the user.
     */
    private List<Vault> toVaults(UUID userId, List<VaultPayload> payloads, Instant now) {
        return payloads.stream().map(payload -> {
            Vault vault = new Vault();
            vault.id = payload.id();
            vault.userId = userId;
            vault.name = payload.name();
            vault.createdAt = orElse(payload.createdAt(), now);
            vault.lastUpdatedAt = orElse(payload.lastUpdatedAt(), vault.createdAt);
            return vault;
        }).toList();
    }

    /**
     * Maps the folder payloads to entities.
     */
    private List<Folder> toFolders(List<FolderPayload> payloads, Instant now) {
        return payloads.stream().map(payload -> {
            Folder folder = new Folder();
            folder.id = payload.id();
            folder.vaultId = payload.vaultId();
            folder.parentFolderId = payload.parentFolderId();
            folder.name = payload.name();
            folder.createdAt = orElse(payload.createdAt(), now);
            folder.lastUpdatedAt = orElse(payload.lastUpdatedAt(), folder.createdAt);
            return folder;
        }).toList();
    }

    /**
     * Maps the file payloads to entities, using empty content where none was sent.
     */
    private List<VaultFile> toFiles(List<FilePayload> payloads, Instant now) {
        return payloads.stream().map(payload -> {
            VaultFile file = new VaultFile();
            file.id = payload.id();
            file.vaultId = payload.vaultId();
            file.folderId = payload.folderId();
            file.type = payload.type();
            file.name = payload.name();
            file.content = payload.content() == null ? "" : payload.content();
            file.createdAt = orElse(payload.createdAt(), now);
            file.lastUpdatedAt = orElse(payload.lastUpdatedAt(), file.createdAt);
            return file;
        }).toList();
    }

    /**
     * Maps the backlink payloads to entities. A link repeated in the payload is stored once, because the table keeps one
     * row per pair of files, and the vault is taken from the source file.
     */
    private List<Backlink> toBacklinks(List<BacklinkPayload> payloads, List<FilePayload> files, Instant now) {
        Map<UUID, UUID> vaultOfFile = new HashMap<>();
        for (FilePayload file : files) {
            vaultOfFile.put(file.id(), file.vaultId());
        }
        Set<FilePair> pairs = payloads.stream()
                .map(payload -> new FilePair(payload.sourceFileId(), payload.targetFileId()))
                .collect(Collectors.toCollection(LinkedHashSet::new));

        return pairs.stream().map(pair -> {
            Backlink backlink = new Backlink();
            backlink.id = UUID.randomUUID();
            backlink.vaultId = vaultOfFile.get(pair.source());
            backlink.sourceFileId = pair.source();
            backlink.targetFileId = pair.target();
            backlink.createdAt = now;
            return backlink;
        }).toList();
    }

    /**
     * Picks the value from the payload, or the fallback when the client did not send one.
     */
    private static Instant orElse(Instant value, Instant fallback) {
        return value == null ? fallback : value;
    }

    /**
     * A link between two files, used to drop repeats.
     */
    private record FilePair(UUID source, UUID target) {
    }
}
