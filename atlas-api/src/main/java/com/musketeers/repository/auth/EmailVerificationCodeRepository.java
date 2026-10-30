package com.musketeers.repository.auth;

import com.musketeers.domain.auth.EmailVerificationCode;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class EmailVerificationCodeRepository implements PanacheRepositoryBase<EmailVerificationCode, UUID> {
    /**
     * Finds the verification code with the given user ID. Since codes are deleted when used and resending a code
     * overwrites the old one, users have at most 1 verification code record
     *
     * @param userId the user ID to look for
     * @return the verification code wrapped, if found
     */
    public Optional<EmailVerificationCode> findByUserId(UUID userId) {
        return find("userId", userId).firstResultOptional();
    }
}
