package com.musketeers.repository;

import com.musketeers.domain.vault.Backlink;
import com.musketeers.domain.vault.Folder;
import com.musketeers.domain.vault.Vault;
import com.musketeers.domain.vault.VaultFile;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;

import java.util.List;

@ApplicationScoped
public class MigrationRepository {
    private static final String DEFER_FOLDER_PARENT = "SET CONSTRAINTS fk_folders_parent DEFERRED";
    private static final String CHECK_FOLDER_PARENT = "SET CONSTRAINTS fk_folders_parent IMMEDIATE";

    private final EntityManager entityManager;

    public MigrationRepository(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    public void insertAll(
            List<Vault> vaults,
            List<Folder> folders,
            List<VaultFile> files,
            List<Backlink> backlinks
    ) {
        entityManager.createNativeQuery(DEFER_FOLDER_PARENT).executeUpdate();

        vaults.forEach(entityManager::persist);
        folders.forEach(entityManager::persist);
        files.forEach(entityManager::persist);
        backlinks.forEach(entityManager::persist);

        entityManager.flush();
        entityManager.createNativeQuery(CHECK_FOLDER_PARENT).executeUpdate();
    }
}
