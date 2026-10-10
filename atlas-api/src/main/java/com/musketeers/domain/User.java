package com.musketeers.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/**
 * A registered user account. Maps the users table, whose schema is owned by Flyway rather than Hibernate.
 */
@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @Column(nullable = false)
    public String email;

    @Column(name = "password_hash", nullable = false)
    public String passwordHash;

    @Column(name = "email_verified_at")
    public Instant emailVerifiedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    public Instant createdAt;

    @Column(name = "last_updated_at", nullable = false)
    public Instant lastUpdatedAt;

    /**
     * Sets both timestamps when the user is first stored.
     */
    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        lastUpdatedAt = now;
    }

    /**
     * Refreshes the last updated timestamp whenever the user changes.
     */
    @PreUpdate
    void onUpdate() {
        lastUpdatedAt = Instant.now();
    }

    /**
     * Prints the id only, so the password hash can never end up in a log line.
     */
    @Override
    public String toString() {
        return "User[id=" + id + "]";
    }
}
