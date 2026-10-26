package com.musketeers.repository;

import com.musketeers.domain.EmailVerificationToken;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.UUID;

@ApplicationScoped
public class EmailVerificationTokenRepository implements PanacheRepositoryBase<EmailVerificationToken, UUID> {
    /**
     * Finds the token that has the given hash.
     *
     * @param tokenHash hash of the token taken from a verification link
     * @return the token, or null if no token has that hash
     */
    public EmailVerificationToken findByTokenHash(String tokenHash) {
        return find("tokenHash", tokenHash).firstResult();
    }
}
