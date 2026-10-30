package com.musketeers.repository.vault;

import com.musketeers.domain.vault.Vault;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.UUID;

@ApplicationScoped
public class VaultRepository implements PanacheRepositoryBase<Vault, UUID> {
}
