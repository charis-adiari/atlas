package com.musketeers.repository.vault;

import com.musketeers.domain.vault.Backlink;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.UUID;

@ApplicationScoped
public class BacklinkRepository implements PanacheRepositoryBase<Backlink, UUID> {
}
