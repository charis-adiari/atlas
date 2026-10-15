package com.musketeers.service.migration;

import com.musketeers.dto.migration.BacklinkPayload;
import com.musketeers.dto.migration.FilePayload;
import com.musketeers.dto.migration.FolderPayload;
import com.musketeers.dto.migration.MigrationRequest;
import com.musketeers.dto.migration.VaultPayload;
import com.musketeers.exception.InvalidMigrationPayloadException;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

public class MigrationPayloadCheckerTests {
    private final MigrationPayloadChecker checker = new MigrationPayloadChecker();

    private final UUID vaultA = UUID.randomUUID();
    private final UUID vaultB = UUID.randomUUID();
    private final UUID folderOne = UUID.randomUUID();
    private final UUID folderTwo = UUID.randomUUID();
    private final UUID fileOne = UUID.randomUUID();
    private final UUID fileTwo = UUID.randomUUID();

    @Test
    void check_WhenPayloadIsEmpty_DoesNotThrow() {
        // Arrange
        MigrationRequest request = request(List.of(), List.of(), List.of(), List.of());

        // Act & Assert
        assertDoesNotThrow(() -> checker.check(request));
    }

    @Test
    void check_WhenPayloadIsConsistentAndChildComesBeforeParent_DoesNotThrow() {
        // Arrange
        MigrationRequest request = request(
                List.of(vault(vaultA), vault(vaultB)),
                List.of(folder(folderTwo, vaultA, folderOne), folder(folderOne, vaultA, null)),
                List.of(file(fileOne, vaultA, folderTwo), file(fileTwo, vaultA, null)),
                List.of(link(fileOne, fileTwo), link(fileTwo, fileOne), link(fileOne, fileOne))
        );

        // Act & Assert
        assertDoesNotThrow(() -> checker.check(request));
    }

    @Test
    void check_WhenFoldersFormAVeryLongChain_DoesNotThrow() {
        // Arrange
        List<FolderPayload> chain = new ArrayList<>();
        UUID parent = null;
        for (int i = 0; i < 20_000; i++) {
            UUID id = UUID.randomUUID();
            chain.add(folder(id, vaultA, parent));
            parent = id;
        }
        MigrationRequest request = request(List.of(vault(vaultA)), chain, List.of(), List.of());

        // Act & Assert
        assertDoesNotThrow(() -> checker.check(request));
    }

    @Test
    void check_WhenAListContainsANullEntry_Throws() {
        // Arrange
        MigrationRequest nullVault = request(Arrays.asList((VaultPayload) null), List.of(), List.of(), List.of());
        MigrationRequest nullFolder = request(List.of(), Arrays.asList((FolderPayload) null), List.of(), List.of());
        MigrationRequest nullFile = request(List.of(), List.of(), Arrays.asList((FilePayload) null), List.of());
        MigrationRequest nullLink = request(List.of(), List.of(), List.of(), Arrays.asList((BacklinkPayload) null));

        // Act & Assert
        for (MigrationRequest request : List.of(nullVault, nullFolder, nullFile, nullLink)) {
            InvalidMigrationPayloadException ex = assertThrows(
                    InvalidMigrationPayloadException.class, () -> checker.check(request));
            assertTrue(ex.getMessage().contains("empty entry"), ex.getMessage());
        }
    }

    @Test
    void check_WhenVaultIdIsDuplicated_Throws() {
        // Arrange
        MigrationRequest request = request(List.of(vault(vaultA), vault(vaultA)), List.of(), List.of(), List.of());

        // Act & Assert
        assertRejectedMentioning(request, vaultA);
    }

    @Test
    void check_WhenFolderIdIsDuplicated_Throws() {
        // Arrange
        MigrationRequest request = request(
                List.of(vault(vaultA)),
                List.of(folder(folderOne, vaultA, null), folder(folderOne, vaultA, null)),
                List.of(), List.of());

        // Act & Assert
        assertRejectedMentioning(request, folderOne);
    }

    @Test
    void check_WhenFolderIsInAVaultThatWasNotUploaded_Throws() {
        // Arrange
        MigrationRequest request = request(
                List.of(vault(vaultA)), List.of(folder(folderOne, vaultB, null)), List.of(), List.of());

        // Act & Assert
        assertRejectedMentioning(request, folderOne);
    }

    @Test
    void check_WhenFolderParentWasNotUploaded_Throws() {
        // Arrange
        MigrationRequest request = request(
                List.of(vault(vaultA)), List.of(folder(folderOne, vaultA, folderTwo)), List.of(), List.of());

        // Act & Assert
        assertRejectedMentioning(request, folderTwo);
    }

    @Test
    void check_WhenFolderParentIsInAnotherVault_Throws() {
        // Arrange
        MigrationRequest request = request(
                List.of(vault(vaultA), vault(vaultB)),
                List.of(folder(folderOne, vaultA, folderTwo), folder(folderTwo, vaultB, null)),
                List.of(), List.of());

        // Act & Assert
        assertRejectedMentioning(request, folderOne);
    }

    @Test
    void check_WhenFolderIsItsOwnParent_Throws() {
        // Arrange
        MigrationRequest request = request(
                List.of(vault(vaultA)), List.of(folder(folderOne, vaultA, folderOne)), List.of(), List.of());

        // Act & Assert
        assertRejectedMentioning(request, folderOne);
    }

    @Test
    void check_WhenFoldersFormACycle_Throws() {
        // Arrange
        MigrationRequest request = request(
                List.of(vault(vaultA)),
                List.of(folder(folderOne, vaultA, folderTwo), folder(folderTwo, vaultA, folderOne)),
                List.of(), List.of());

        // Act
        InvalidMigrationPayloadException ex = assertThrows(
                InvalidMigrationPayloadException.class, () -> checker.check(request));

        // Assert
        assertTrue(ex.getMessage().contains("cycle"), ex.getMessage());
    }

    @Test
    void check_WhenFileIdIsDuplicated_Throws() {
        // Arrange
        MigrationRequest request = request(
                List.of(vault(vaultA)), List.of(),
                List.of(file(fileOne, vaultA, null), file(fileOne, vaultA, null)), List.of());

        // Act & Assert
        assertRejectedMentioning(request, fileOne);
    }

    @Test
    void check_WhenFileIsInAVaultThatWasNotUploaded_Throws() {
        // Arrange
        MigrationRequest request = request(
                List.of(vault(vaultA)), List.of(), List.of(file(fileOne, vaultB, null)), List.of());

        // Act & Assert
        assertRejectedMentioning(request, fileOne);
    }

    @Test
    void check_WhenFileFolderWasNotUploaded_Throws() {
        // Arrange
        MigrationRequest request = request(
                List.of(vault(vaultA)), List.of(), List.of(file(fileOne, vaultA, folderOne)), List.of());

        // Act & Assert
        assertRejectedMentioning(request, folderOne);
    }

    @Test
    void check_WhenFileFolderIsInAnotherVault_Throws() {
        // Arrange
        MigrationRequest request = request(
                List.of(vault(vaultA), vault(vaultB)),
                List.of(folder(folderOne, vaultB, null)),
                List.of(file(fileOne, vaultA, folderOne)),
                List.of());

        // Act & Assert
        assertRejectedMentioning(request, fileOne);
    }

    @Test
    void check_WhenBacklinkSourceWasNotUploaded_Throws() {
        // Arrange
        MigrationRequest request = request(
                List.of(vault(vaultA)), List.of(), List.of(file(fileTwo, vaultA, null)),
                List.of(link(fileOne, fileTwo)));

        // Act & Assert
        assertRejectedMentioning(request, fileOne);
    }

    @Test
    void check_WhenBacklinkTargetWasNotUploaded_Throws() {
        // Arrange
        MigrationRequest request = request(
                List.of(vault(vaultA)), List.of(), List.of(file(fileOne, vaultA, null)),
                List.of(link(fileOne, fileTwo)));

        // Act & Assert
        assertRejectedMentioning(request, fileTwo);
    }

    @Test
    void check_WhenBacklinkJoinsFilesInDifferentVaults_Throws() {
        // Arrange
        MigrationRequest request = request(
                List.of(vault(vaultA), vault(vaultB)), List.of(),
                List.of(file(fileOne, vaultA, null), file(fileTwo, vaultB, null)),
                List.of(link(fileOne, fileTwo)));

        // Act
        InvalidMigrationPayloadException ex = assertThrows(
                InvalidMigrationPayloadException.class, () -> checker.check(request));

        // Assert
        assertTrue(ex.getMessage().contains("different vaults"), ex.getMessage());
    }

    private void assertRejectedMentioning(MigrationRequest request, UUID id) {
        InvalidMigrationPayloadException ex = assertThrows(
                InvalidMigrationPayloadException.class, () -> checker.check(request));
        assertTrue(ex.getMessage().contains(id.toString()), ex.getMessage());
    }

    private static MigrationRequest request(
            List<VaultPayload> vaults,
            List<FolderPayload> folders,
            List<FilePayload> files,
            List<BacklinkPayload> backlinks
    ) {
        return new MigrationRequest(vaults, folders, files, backlinks);
    }

    private static VaultPayload vault(UUID id) {
        return new VaultPayload(id, "Vault", null, null);
    }

    private static FolderPayload folder(UUID id, UUID vaultId, UUID parentId) {
        return new FolderPayload(id, vaultId, parentId, "Folder", null, null);
    }

    private static FilePayload file(UUID id, UUID vaultId, UUID folderId) {
        return new FilePayload(id, vaultId, folderId, "note", "File", "text", null, null);
    }

    private static BacklinkPayload link(UUID source, UUID target) {
        return new BacklinkPayload(source, target);
    }
}
