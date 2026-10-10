package com.musketeers.util;

import java.util.Locale;

/**
 * Helpers for email addresses.
 */
public final class Emails {
    private Emails() {
    }

    /**
     * Trims and lower-cases an address. The users table only accepts addresses in this form
     * (ck_users_email_normalised), which is what makes its UNIQUE constraint case-insensitive.
     *
     * @param email address as typed, may be null
     * @return the normalised address, or null if the input was null
     */
    public static String normalize(String email) {
        return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }
}
