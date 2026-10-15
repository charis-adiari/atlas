package com.musketeers.service.migration;

import com.musketeers.domain.User;
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
import com.musketeers.exception.InvalidMigrationPayloadException;
import com.musketeers.exception.MigrationConflictException;
import com.musketeers.repository.MigrationRepository;
import com.musketeers.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import jakarta.persistence.PersistenceException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.sql.SQLException;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
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
    private static final Instant UPDATED = Instant.parse("2025-06-07T08:09:10Z");

    @Mock
    UserRepository userRepository;

    @Mock
    MigrationRepository migrationRepository;

    @Mock
    MigrationPayloadChecker checker;

    @InjectMocks
    MigrationService service;

    @Captor
    ArgumentCaptor<List<Vault>> vaults;

    @Captor
    ArgumentCaptor<List<Folder>> folders;

    @Captor
    ArgumentCaptor<List<VaultFile>> files;

    @Captor
    ArgumentCaptor<List<Backlink>> backlinks;

    @Test
    void migrate_StoresEveryRecordOwnedByTheUserAndReturnsTheCounts() {
        // Arrange
        when(userRepository.findById(USER_ID)).thenReturn(new User());
        MigrationRequest request = fullRequest();

        // Act
        MigrationResponse result = service.migrate(USER_ID, request);

        // Assert
        verify(checker).check(request);
        verifyInserted();
        assertEquals(new MigrationResponse(2, 2, 2, 1), result);
        assertTrue(vaults.getValue().stream().allMatch(vault -> USER_ID.equals(vault.userId)));
        assertEquals(List.of(VAULT_ID, OTHER_VAULT_ID), vaults.getValue().stream().map(v -> v.id).toList());
        assertEquals(PARENT_ID, folders.getValue().get(0).parentFolderId);
        assertEquals(CHILD_ID, files.getValue().get(0).folderId);
        assertEquals("canvas", files.getValue().get(1).type);
    }

    @Test
    void migrate_KeepsTheTimestampsTheRecordsHadLocally() {
        // Arrange
        when(userRepository.findById(USER_ID)).thenReturn(new User());
        MigrationRequest request = new MigrationRequest(
                List.of(new VaultPayload(VAULT_ID, "Vault", CREATED, UPDATED)),
                List.of(new FolderPayload(PARENT_ID, VAULT_ID, null, "Folder", CREATED, UPDATED)),
                List.of(new FilePayload(NOTE_ID, VAULT_ID, null, "note", "Note", "text", CREATED, UPDATED)),
                List.of());

        // Act
        service.migrate(USER_ID, request);

        // Assert
        verifyInserted();
        assertEquals(CREATED, vaults.getValue().get(0).createdAt);
        assertEquals(UPDATED, vaults.getValue().get(0).lastUpdatedAt);
        assertEquals(CREATED, folders.getValue().get(0).createdAt);
        assertEquals(UPDATED, folders.getValue().get(0).lastUpdatedAt);
        assertEquals(CREATED, files.getValue().get(0).createdAt);
        assertEquals(UPDATED, files.getValue().get(0).lastUpdatedAt);
    }

    @Test
    void migrate_WhenTimestampsAreMissing_UsesTheCurrentTime() {
        // Arrange
        when(userRepository.findById(USER_ID)).thenReturn(new User());
        MigrationRequest request = new MigrationRequest(
                List.of(new VaultPayload(VAULT_ID, "Vault", null, null)), List.of(), List.of(), List.of());
        Instant before = Instant.now();

        // Act
        service.migrate(USER_ID, request);

        // Assert
        verifyInserted();
        Vault stored = vaults.getValue().get(0);
        assertFalse(stored.createdAt.isBefore(before));
        assertFalse(stored.createdAt.isAfter(Instant.now()));
        assertEquals(stored.createdAt, stored.lastUpdatedAt);
    }

    @Test
    void migrate_WhenFileContentIsMissing_StoresEmptyContent() {
        // Arrange
        when(userRepository.findById(USER_ID)).thenReturn(new User());
        MigrationRequest request = new MigrationRequest(
                List.of(new VaultPayload(VAULT_ID, "Vault", null, null)),
                List.of(),
                List.of(new FilePayload(NOTE_ID, VAULT_ID, null, "note", "Note", null, null, null)),
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
        when(userRepository.findById(USER_ID)).thenReturn(new User());
        MigrationRequest request = new MigrationRequest(
                List.of(new VaultPayload(VAULT_ID, "Vault", null, null)),
                List.of(),
                List.of(
                        new FilePayload(NOTE_ID, VAULT_ID, null, "note", "A", "", null, null),
                        new FilePayload(CANVAS_ID, VAULT_ID, null, "canvas", "B", "", null, null)),
                List.of(new BacklinkPayload(NOTE_ID, CANVAS_ID), new BacklinkPayload(NOTE_ID, CANVAS_ID)));

        // Act
        MigrationResponse result = service.migrate(USER_ID, request);

        // Assert
        verifyInserted();
        assertEquals(1, result.backlinks());
        Backlink stored = backlinks.getValue().get(0);
        assertEquals(VAULT_ID, stored.vaultId);
        assertEquals(NOTE_ID, stored.sourceFileId);
        assertEquals(CANVAS_ID, stored.targetFileId);
        assertNotNull(stored.id);
    }

    @Test
    void migrate_WhenUserDoesNotExist_ThrowsEntityNotFoundException() {
        // Arrange
        when(userRepository.findById(USER_ID)).thenReturn(null);

        // Act & Assert
        assertThrows(EntityNotFoundException.class, () -> service.migrate(USER_ID, fullRequest()));
        verifyNoInteractions(checker, migrationRepository);
    }

    @Test
    void migrate_WhenPayloadIsInconsistent_StoresNothing() {
        // Arrange
        when(userRepository.findById(USER_ID)).thenReturn(new User());
        MigrationRequest request = fullRequest();
        doThrow(new InvalidMigrationPayloadException("bad")).when(checker).check(request);

        // Act & Assert
        assertThrows(InvalidMigrationPayloadException.class, () -> service.migrate(USER_ID, request));
        verifyNoInteractions(migrationRepository);
    }

    @Test
    void migrate_WhenIdsAreAlreadyInUse_ThrowsMigrationConflictException() {
        // Arrange
        when(userRepository.findById(USER_ID)).thenReturn(new User());
        SQLException duplicate = new SQLException("ERROR: duplicate key value violates unique constraint", "23505");
        doThrow(new PersistenceException(duplicate)).when(migrationRepository).insertAll(any(), any(), any(), any());

        // Act
        MigrationConflictException ex = assertThrows(
                MigrationConflictException.class, () -> service.migrate(USER_ID, fullRequest()));

        // Assert
        assertEquals(MigrationConflictException.MESSAGE, ex.getMessage());
    }

    @Test
    void migrate_WhenDatabaseFailsForAnotherReason_RethrowsTheError() {
        // Arrange
        when(userRepository.findById(USER_ID)).thenReturn(new User());
        PersistenceException failure = new PersistenceException("connection lost");
        doThrow(failure).when(migrationRepository).insertAll(any(), any(), any(), any());

        // Act
        PersistenceException thrown = assertThrows(
                PersistenceException.class, () -> service.migrate(USER_ID, fullRequest()));

        // Assert
        assertSame(failure, thrown);
    }

    private void verifyInserted() {
        verify(migrationRepository).insertAll(vaults.capture(), folders.capture(), files.capture(), backlinks.capture());
    }

    private static MigrationRequest fullRequest() {
        return new MigrationRequest(
                List.of(
                        new VaultPayload(VAULT_ID, "First", null, null),
                        new VaultPayload(OTHER_VAULT_ID, "Second", null, null)),
                List.of(
                        new FolderPayload(CHILD_ID, VAULT_ID, PARENT_ID, "Child", null, null),
                        new FolderPayload(PARENT_ID, VAULT_ID, null, "Parent", null, null)),
                List.of(
                        new FilePayload(NOTE_ID, VAULT_ID, CHILD_ID, "note", "Note", "text", null, null),
                        new FilePayload(CANVAS_ID, VAULT_ID, null, "canvas", "Canvas", "{}", null, null)),
                List.of(new BacklinkPayload(NOTE_ID, CANVAS_ID)));
    }
}
