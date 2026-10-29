package com.musketeers.repository.vault;

import com.musketeers.domain.vault.Folder;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;

import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class FolderRepository implements PanacheRepositoryBase<Folder, UUID> {
    private static final String DEFER_PARENT_CHECK = "SET CONSTRAINTS fk_folders_parent DEFERRED";
    private static final String RUN_PARENT_CHECK = "SET CONSTRAINTS fk_folders_parent IMMEDIATE";

    /**
     * Persists folders in any order, a child before its parent. The parent check is postponed while they are inserted
     * and run before this method returns, so a bad hierarchy fails here instead of at commit time. The flush also
     * sends every other pending insert of the transaction.
     *
     * @throws jakarta.persistence.PersistenceException if the database rejects a folder, for example because its
     *                                                  parent does not exist
     */
    @Transactional(Transactional.TxType.MANDATORY)
    public void persistAllInAnyOrder(List<Folder> folders) {
        EntityManager em = getEntityManager();
        em.createNativeQuery(DEFER_PARENT_CHECK).executeUpdate();
        persist(folders);
        flush();
        em.createNativeQuery(RUN_PARENT_CHECK).executeUpdate();
    }
}
