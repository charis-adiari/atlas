package com.musketeers.repository.vault;

import com.musketeers.domain.vault.Folder;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.UUID;

@ApplicationScoped
public class FolderRepository implements PanacheRepositoryBase<Folder, UUID> {
}
