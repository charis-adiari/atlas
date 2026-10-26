package com.musketeers.service.migration;

import com.musketeers.api.vaults.mappers.MigrationMapper;
import com.musketeers.domain.User;
import com.musketeers.domain.vault.Backlink;
import com.musketeers.domain.vault.Folder;
import com.musketeers.domain.vault.Vault;
import com.musketeers.domain.vault.VaultFile;
import com.musketeers.dto.migration.FileDto;
import com.musketeers.dto.migration.MigrationRequest;
import com.musketeers.repository.UserRepository;
import com.musketeers.repository.vault.BacklinkRepository;
import com.musketeers.repository.vault.FileRepository;
import com.musketeers.repository.vault.FolderRepository;
import com.musketeers.repository.vault.VaultRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityNotFoundException;
import jakarta.persistence.PersistenceException;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.ForbiddenException;
import org.hibernate.exception.ConstraintViolationException;

import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Moves an anonymous user's local data into their account
 */
@ApplicationScoped
public class MigrationService {
    public static final String UNVERIFIED_EMAIL_MESSAGE = "Verify your email address before migrating data.";
    public static final String DEFER_PARENT_CHECK = "SET CONSTRAINTS fk_folders_parent DEFERRED";
    public static final String RUN_PARENT_CHECK = "SET CONSTRAINTS fk_folders_parent IMMEDIATE";
    public static final String NOT_SAVED_MESSAGE = "The data could not be saved. Some of it may already have been "
            + "migrated.";

    private final UserRepository userRepository;
    private final VaultRepository vaultRepository;
    private final FolderRepository folderRepository;
    private final FileRepository fileRepository;
    private final BacklinkRepository backlinkRepository;
    private final MigrationPayloadChecker checker;
    private final MigrationMapper mapper;
    private final EntityManager entityManager;

    public MigrationService(
            UserRepository userRepository,
            VaultRepository vaultRepository,
            FolderRepository folderRepository,
            FileRepository fileRepository,
            BacklinkRepository backlinkRepository,
            MigrationPayloadChecker checker,
            MigrationMapper mapper,
            EntityManager entityManager
    ) {
        this.userRepository = userRepository;
        this.vaultRepository = vaultRepository;
        this.folderRepository = folderRepository;
        this.fileRepository = fileRepository;
        this.backlinkRepository = backlinkRepository;
        this.checker = checker;
        this.mapper = mapper;
        this.entityManager = entityManager;
    }

    /**
     * Stores the whole payload for the user in a single transaction, so either every vault, folder, file and backlink
     * is saved or none of them is. Every record is owned by the given user, whatever the payload says, and keeps the
     * id and creation time it had locally. Its last updated time is the moment of the migration. The user id must come
     * from the verified token, never from the request.
     *
     * @param userId id of the signed-in user
     * @param request the local payload
     * @throws EntityNotFoundException if the user no longer exists
     * @throws ForbiddenException if the user has not verified their email address
     * @throws IllegalArgumentException if the payload contradicts itself or some of the ids are already in use
     */
    @Transactional
    public void migrate(UUID userId, MigrationRequest request) {
        User user = userRepository.findById(userId);
        if (user == null) {
            throw new EntityNotFoundException("User not found");
        }
        if (user.emailVerifiedAt == null) {
            throw new ForbiddenException(UNVERIFIED_EMAIL_MESSAGE);
        }
        checker.check(request);

        Instant now = Instant.now();
        List<Vault> vaults = request.vaults().stream().map(dto -> mapper.toVault(dto, userId, now)).toList();
        List<Folder> folders = request.folders().stream().map(dto -> mapper.toFolder(dto, now)).toList();
        List<VaultFile> files = request.files().stream().map(dto -> mapper.toFile(dto, now)).toList();
        List<Backlink> backlinks = toBacklinks(request, now);

        insert(vaults, folders, files, backlinks);
    }

    /**
     * Writes everything. The flush happens here so a clash with ids that already exist surfaces inside this method
     * instead of at commit time, and the whole transaction then rolls back.
     *
     * Depending on the Hibernate version the violation is thrown itself or wrapped in another persistence exception,
     * so both are recognised.
     *
     * @throws IllegalArgumentException if the database rejected a record because of a constraint
     */
    private void insert(List<Vault> vaults, List<Folder> folders, List<VaultFile> files, List<Backlink> backlinks) {
        try {
            deferParentCheck();
            vaultRepository.persist(vaults);
            folderRepository.persist(folders);
            fileRepository.persist(files);
            backlinkRepository.persist(backlinks);
            backlinkRepository.flush();
            runParentCheck();
        } catch (PersistenceException e) {
            if (e instanceof ConstraintViolationException || e.getCause() instanceof ConstraintViolationException) {
                throw new IllegalArgumentException(NOT_SAVED_MESSAGE);
            }
            throw e;
        }
    }

    /**
     * Postpones the check that a folder's parent exists until {@link #runParentCheck} is called, for the rest of the
     * current transaction. This lets folders be inserted in any order, a child before its parent.
     */
    private void deferParentCheck() {
        entityManager.createNativeQuery(DEFER_PARENT_CHECK).executeUpdate();
    }

    /**
     * Runs the postponed parent check now, so a missing parent fails inside the migration instead of when the
     * transaction commits. Pending inserts must be flushed first.
     */
    private void runParentCheck() {
        entityManager.createNativeQuery(RUN_PARENT_CHECK).executeUpdate();
    }

    /**
     * Maps the backlinks of the payload. A link repeated in the payload is stored once, because the table keeps one row
     * per pair of files, and the vault of each link is the vault of its source file.
     */
    private List<Backlink> toBacklinks(MigrationRequest request, Instant now) {
        Map<UUID, UUID> vaultOfFile = request.files().stream()
                .collect(Collectors.toMap(FileDto::id, FileDto::vaultId));

        return new LinkedHashSet<>(request.backlinks()).stream()
                .map(dto -> mapper.toBacklink(dto, vaultOfFile.get(dto.sourceFileId()), now))
                .toList();
    }
}
