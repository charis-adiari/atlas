package com.musketeers.repository.vault;

import com.musketeers.domain.vault.Folder;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.UUID;

@ApplicationScoped
public class FolderRepository implements PanacheRepositoryBase<Folder, UUID> {
    private static final String DEFER_PARENT_CHECK = "SET CONSTRAINTS fk_folders_parent DEFERRED";
    private static final String RUN_PARENT_CHECK = "SET CONSTRAINTS fk_folders_parent IMMEDIATE";

    /**
     * Postpones the check that a folder's parent exists until {@link #runParentCheck} is called, for the rest of the
     * current transaction. This lets folders be inserted in any order, a child before its parent.
     */
    public void deferParentCheck() {
        getEntityManager().createNativeQuery(DEFER_PARENT_CHECK).executeUpdate();
    }

    /**
     * Runs the postponed parent check now, so a missing parent fails here instead of when the transaction commits.
     * Pending inserts must be flushed first.
     */
    public void runParentCheck() {
        getEntityManager().createNativeQuery(RUN_PARENT_CHECK).executeUpdate();
    }
}
