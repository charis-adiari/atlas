package com.musketeers.domain.auth;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * A 6-digit code that proves a user owns their email address. Only a peppered hash of the code is stored
 */
@Entity
@Table(name = "email_verification_codes")
public class EmailVerificationCode {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @Column(name = "user_id", nullable = false)
    public UUID userId;

    @Column(name = "code_hash", nullable = false)
    public byte[] codeHash;

    @Column(name = "expires_at", nullable = false)
    public Instant expiresAt;

    @Column(name = "attempts", nullable = false)
    public short attempts;

    @Column(name = "resend_count", nullable = false)
    public short resendCount;

    @Column(name = "last_sent_at", nullable = false)
    public Instant lastSentAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    public Instant createdAt;

    public EmailVerificationCode(
            UUID userId,
            byte[] codeHash,
            Instant expiresAt) {
        this.userId = userId;
        this.codeHash = codeHash;
        this.expiresAt = expiresAt;
    }

    public EmailVerificationCode() {
    }
}
