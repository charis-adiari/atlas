package com.musketeers.service.migration;

import com.musketeers.domain.vault.FileType;
import com.musketeers.dto.migration.BacklinkDto;
import com.musketeers.dto.migration.FileDto;
import com.musketeers.dto.migration.FolderDto;
import com.musketeers.dto.migration.MigrationRequest;
import com.musketeers.dto.migration.VaultDto;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

public class MigrationPayloadCheckerTests {
    private static final Instant CREATED_AT = Instant.parse("2025-01-02T03:04:05Z");

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
        List<FolderDto> chain = new ArrayList<>();
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
        MigrationRequest nullVault = request(Arrays.asList((VaultDto) null), List.of(), List.of(), List.of());
        MigrationRequest nullFolder = request(List.of(), Arrays.asList((FolderDto) null), List.of(), List.of());
        MigrationRequest nullFile = request(List.of(), List.of(), Arrays.asList((FileDto) null), List.of());
        MigrationRequest nullLink = request(List.of(), List.of(), List.of(), Arrays.asList((BacklinkDto) null));

        // Act & Assert
        for (MigrationRequest request : List.of(nullVault, nullFolder, nullFile, nullLink)) {
            IllegalArgumentException ex = assertThrows(
                    IllegalArgumentException.class, () -> checker.check(request));
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
        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class, () -> checker.check(request));

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
        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class, () -> checker.check(request));

        // Assert
        assertTrue(ex.getMessage().contains("different vaults"), ex.getMessage());
    }

    private void assertRejectedMentioning(MigrationRequest request, UUID id) {
        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class, () -> checker.check(request));
        assertTrue(ex.getMessage().contains(id.toString()), ex.getMessage());
    }

    private static MigrationRequest request(
            List<VaultDto> vaults,
            List<FolderDto> folders,
            List<FileDto> files,
            List<BacklinkDto> backlinks
    ) {
        return new MigrationRequest(vaults, folders, files, backlinks);
    }

    private static VaultDto vault(UUID id) {
        return new VaultDto(id, "Vault", CREATED_AT);
    }

    private static FolderDto folder(UUID id, UUID vaultId, UUID parentId) {
        return new FolderDto(id, vaultId, parentId, "Folder", CREATED_AT);
    }

    private static FileDto file(UUID id, UUID vaultId, UUID folderId) {
        return new FileDto(id, vaultId, folderId, FileType.NOTE, "File", "text", CREATED_AT);
    }

    private static BacklinkDto link(UUID source, UUID target) {
        return new BacklinkDto(source, target);
    }
}
