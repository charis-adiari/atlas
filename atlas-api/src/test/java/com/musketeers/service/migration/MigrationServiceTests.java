package com.musketeers.service.migration;

import com.musketeers.api.vaults.mappers.MigrationMapperImpl;
import com.musketeers.domain.User;
import com.musketeers.domain.vault.Backlink;
import com.musketeers.domain.vault.FileType;
import com.musketeers.domain.vault.Folder;
import com.musketeers.domain.vault.Vault;
import com.musketeers.domain.vault.VaultFile;
import com.musketeers.dto.migration.BacklinkDto;
import com.musketeers.dto.migration.FileDto;
import com.musketeers.dto.migration.FolderDto;
import com.musketeers.dto.migration.MigrationRequest;
import com.musketeers.dto.migration.VaultDto;
import com.musketeers.repository.UserRepository;
import com.musketeers.repository.vault.BacklinkRepository;
import com.musketeers.repository.vault.FileRepository;
import com.musketeers.repository.vault.FolderRepository;
import com.musketeers.repository.vault.VaultRepository;
import jakarta.persistence.EntityNotFoundException;
import jakarta.persistence.PersistenceException;
import jakarta.ws.rs.ForbiddenException;
import org.hibernate.exception.ConstraintViolationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.ArgumentMatchers;
import org.mockito.Captor;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class MigrationServiceTests {
    private static final UUID USER_ID = UUID.randomUUID();
    private static final UUID VAULT_ID = UUID.randomUUID();
    private static final UUID OTHER_VAULT_ID = UUID.randomUUID();
    private static final UUID PARENT_ID = UUID.randomUUID();
    private static final UUID CHILD_ID = UUID.randomUUID();
    private static final UUID NOTE_ID = UUID.randomUUID();
    private static final UUID CANVAS_ID = UUID.randomUUID();
    private static final Instant CREATED = Instant.parse("2025-01-02T03:04:05Z");

    @Mock
    UserRepository userRepository;

    @Mock
    VaultRepository vaultRepository;

    @Mock
    FolderRepository folderRepository;

    @Mock
    FileRepository fileRepository;

    @Mock
    BacklinkRepository backlinkRepository;

    @Mock
    MigrationPayloadChecker checker;

    @Captor
    ArgumentCaptor<List<Vault>> vaults;

    @Captor
    ArgumentCaptor<List<Folder>> folders;

    @Captor
    ArgumentCaptor<List<VaultFile>> files;

    @Captor
    ArgumentCaptor<List<Backlink>> backlinks;

    private MigrationService service;

    @BeforeEach
    void createService() {
        service = new MigrationService(
                userRepository, vaultRepository, folderRepository, fileRepository, backlinkRepository, checker,
                new MigrationMapperImpl());
    }

    @Test
    void migrate_StoresEveryRecordOwnedByTheUser() {
        // Arrange
        when(userRepository.findById(USER_ID)).thenReturn(verifiedUser());
        MigrationRequest request = fullRequest();

        // Act
        service.migrate(USER_ID, request);

        // Assert
        verify(checker).check(request);
        verifyInserted();
        assertTrue(vaults.getValue().stream().allMatch(vault -> USER_ID.equals(vault.userId)));
        assertEquals(List.of(VAULT_ID, OTHER_VAULT_ID), vaults.getValue().stream().map(v -> v.id).toList());
        assertEquals(2, folders.getValue().size());
        assertEquals(PARENT_ID, folders.getValue().get(0).parentFolderId);
        assertEquals(2, files.getValue().size());
        assertEquals(CHILD_ID, files.getValue().get(0).folderId);
        assertEquals(FileType.NOTE, files.getValue().get(0).type);
        assertEquals(FileType.CANVAS, files.getValue().get(1).type);
        assertEquals(1, backlinks.getValue().size());
    }

    @Test
    void migrate_KeepsTheCreationTimeAndSetsTheLastUpdatedTimeToTheMigrationTime() {
        // Arrange
        when(userRepository.findById(USER_ID)).thenReturn(verifiedUser());
        MigrationRequest request = fullRequest();
        Instant before = Instant.now();

        // Act
        service.migrate(USER_ID, request);

        // Assert
        Instant after = Instant.now();
        verifyInserted();
        Vault vault = vaults.getValue().get(0);
        Folder folder = folders.getValue().get(0);
        VaultFile file = files.getValue().get(0);
        assertEquals(CREATED, vault.createdAt);
        assertEquals(CREATED, folder.createdAt);
        assertEquals(CREATED, file.createdAt);
        for (Instant lastUpdatedAt : List.of(vault.lastUpdatedAt, folder.lastUpdatedAt, file.lastUpdatedAt)) {
            assertFalse(lastUpdatedAt.isBefore(before));
            assertFalse(lastUpdatedAt.isAfter(after));
        }
    }

    @Test
    void migrate_WhenFileContentIsMissing_StoresEmptyContent() {
        // Arrange
        when(userRepository.findById(USER_ID)).thenReturn(verifiedUser());
        MigrationRequest request = new MigrationRequest(
                List.of(new VaultDto(VAULT_ID, "Vault", CREATED)),
                List.of(),
                List.of(new FileDto(NOTE_ID, VAULT_ID, null, FileType.NOTE, "Note", null, CREATED)),
                List.of());

        // Act
        service.migrate(USER_ID, request);

        // Assert
        verifyInserted();
        assertEquals("", files.getValue().get(0).content);
    }

    @Test
    void migrate_WhenABacklinkIsRepeated_StoresItOnceInTheVaultOfItsSourceFile() {
        // Arrange
        when(userRepository.findById(USER_ID)).thenReturn(verifiedUser());
        MigrationRequest request = new MigrationRequest(
                List.of(new VaultDto(VAULT_ID, "Vault", CREATED)),
                List.of(),
                List.of(
                        new FileDto(NOTE_ID, VAULT_ID, null, FileType.NOTE, "A", "", CREATED),
                        new FileDto(CANVAS_ID, VAULT_ID, null, FileType.CANVAS, "B", "", CREATED)),
                List.of(new BacklinkDto(NOTE_ID, CANVAS_ID), new BacklinkDto(NOTE_ID, CANVAS_ID)));
        Instant before = Instant.now();

        // Act
        service.migrate(USER_ID, request);

        // Assert
        verifyInserted();
        assertEquals(1, backlinks.getValue().size());
        Backlink stored = backlinks.getValue().get(0);
        assertEquals(VAULT_ID, stored.vaultId);
        assertEquals(NOTE_ID, stored.sourceFileId);
        assertEquals(CANVAS_ID, stored.targetFileId);
        assertFalse(stored.createdAt.isBefore(before.truncatedTo(ChronoUnit.MILLIS)));
        assertNull(stored.id);
    }

    @Test
    void migrate_PostponesTheParentCheckUntilEverythingIsFlushed() {
        // Arrange
        when(userRepository.findById(USER_ID)).thenReturn(verifiedUser());

        // Act
        service.migrate(USER_ID, fullRequest());

        // Assert
        InOrder order = inOrder(folderRepository, vaultRepository, fileRepository, backlinkRepository);
        order.verify(folderRepository).deferParentCheck();
        order.verify(vaultRepository).persist(vaults.capture());
        order.verify(folderRepository).persist(folders.capture());
        order.verify(fileRepository).persist(files.capture());
        order.verify(backlinkRepository).persist(backlinks.capture());
        order.verify(backlinkRepository).flush();
        order.verify(folderRepository).runParentCheck();
    }

    @Test
    void migrate_WhenUserDoesNotExist_ThrowsEntityNotFoundException() {
        // Arrange
        when(userRepository.findById(USER_ID)).thenReturn(null);

        // Act & Assert
        assertThrows(EntityNotFoundException.class, () -> service.migrate(USER_ID, fullRequest()));
        verifyNoInteractions(checker, vaultRepository, folderRepository, fileRepository, backlinkRepository);
    }

    @Test
    void migrate_WhenEmailIsNotVerified_ThrowsForbiddenException() {
        // Arrange
        when(userRepository.findById(USER_ID)).thenReturn(new User());

        // Act
        ForbiddenException ex = assertThrows(ForbiddenException.class, () -> service.migrate(USER_ID, fullRequest()));

        // Assert
        assertEquals(MigrationService.UNVERIFIED_EMAIL_MESSAGE, ex.getMessage());
        verifyNoInteractions(checker, vaultRepository, folderRepository, fileRepository, backlinkRepository);
    }

    @Test
    void migrate_WhenPayloadIsInconsistent_StoresNothing() {
        // Arrange
        when(userRepository.findById(USER_ID)).thenReturn(verifiedUser());
        MigrationRequest request = fullRequest();
        doThrow(new IllegalArgumentException("bad")).when(checker).check(request);

        // Act & Assert
        assertThrows(IllegalArgumentException.class, () -> service.migrate(USER_ID, request));
        verifyNoInteractions(vaultRepository, folderRepository, fileRepository, backlinkRepository);
    }

    @Test
    void migrate_WhenIdsAreAlreadyInUse_ThrowsIllegalArgumentExceptionWithGenericMessage() {
        // Arrange
        when(userRepository.findById(USER_ID)).thenReturn(verifiedUser());
        PersistenceException duplicate = new PersistenceException(mock(ConstraintViolationException.class));
        doThrow(duplicate).when(vaultRepository).persist(ArgumentMatchers.<Vault>anyList());

        // Act
        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class, () -> service.migrate(USER_ID, fullRequest()));

        // Assert
        assertEquals(MigrationService.NOT_SAVED_MESSAGE, ex.getMessage());
    }

    @Test
    void migrate_WhenDatabaseFailsForAnotherReason_RethrowsTheError() {
        // Arrange
        when(userRepository.findById(USER_ID)).thenReturn(verifiedUser());
        PersistenceException failure = new PersistenceException("connection lost");
        doThrow(failure).when(vaultRepository).persist(ArgumentMatchers.<Vault>anyList());

        // Act
        PersistenceException thrown = assertThrows(
                PersistenceException.class, () -> service.migrate(USER_ID, fullRequest()));

        // Assert
        assertSame(failure, thrown);
    }

    private void verifyInserted() {
        verify(vaultRepository).persist(vaults.capture());
        verify(folderRepository).persist(folders.capture());
        verify(fileRepository).persist(files.capture());
        verify(backlinkRepository).persist(backlinks.capture());
    }

    private static User verifiedUser() {
        User user = new User();
        user.emailVerifiedAt = Instant.now();
        return user;
    }

    private static MigrationRequest fullRequest() {
        return new MigrationRequest(
                List.of(
                        new VaultDto(VAULT_ID, "First", CREATED),
                        new VaultDto(OTHER_VAULT_ID, "Second", CREATED)),
                List.of(
                        new FolderDto(CHILD_ID, VAULT_ID, PARENT_ID, "Child", CREATED),
                        new FolderDto(PARENT_ID, VAULT_ID, null, "Parent", CREATED)),
                List.of(
                        new FileDto(NOTE_ID, VAULT_ID, CHILD_ID, FileType.NOTE, "Note", "text", CREATED),
                        new FileDto(CANVAS_ID, VAULT_ID, null, FileType.CANVAS, "Canvas", "{}", CREATED)),
                List.of(new BacklinkDto(NOTE_ID, CANVAS_ID)));
    }
}
