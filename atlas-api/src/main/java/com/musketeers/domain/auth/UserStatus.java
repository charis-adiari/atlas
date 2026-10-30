package com.musketeers.domain.auth;

/**
 * Represents the status of a user account.
 */
public enum UserStatus {
    /** The user has registered but email verification is pending. */
    PENDING("Pending"),
    /** The user is active and able to use the system. */
    ACTIVE("Active");

    private final String description;

    UserStatus(String description) {
        this.description = description;
    }

    /**
     * Returns the lookup code for this status.
     * <p>
     * The code is identical to the constant name and is the value stored in the database.
     *
     * @return the status code, e.g. {@code "PENDING"}
     */
    public String getCode() {
        return name();
    }

    /**
     * Returns the human-readable description of this status.
     *
     * @return the sentence-case description, e.g. {@code "Pending"}
     */
    public String getDescription() {
        return description;
    }
}
