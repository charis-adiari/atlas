package com.musketeers.repository.vault;

import com.musketeers.domain.vault.VaultFile;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.UUID;

@ApplicationScoped
public class FileRepository implements PanacheRepositoryBase<VaultFile, UUID> {
}
