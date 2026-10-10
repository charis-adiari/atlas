package com.musketeers.validation;

import java.nio.charset.StandardCharsets;
import java.util.regex.Pattern;

/**
 * The password rules, kept in one dependency-free place so they can be unit tested without Quarkus.
 * <ul>
 *   <li>At least 8 characters, with one lower-case letter, one upper-case letter, one digit and one special
 *       character (anything that is not A-Z, a-z or 0-9, so spaces and accented letters count as special).</li>
 *   <li>At most 72 bytes in UTF-8: bcrypt only reads the first 72 bytes, so a longer password would be silently
 *       truncated, and an upper bound also stops huge request bodies from being hashed.</li>
 * </ul>
 * The front end must apply exactly the same rules, or users will see the form accept a password that the server then
 * rejects.
 */
public final class PasswordPolicy {
    public static final int MIN_LENGTH = 8;
    public static final int MAX_BYTES = 72;

    private static final Pattern STRONG = Pattern.compile(
            "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{" + MIN_LENGTH + ",}$",
            Pattern.DOTALL);

    private PasswordPolicy() {
    }

    /**
     * Checks a password against every rule. The cheap length checks run first so the regex never sees an oversized
     * input.
     *
     * @param password the candidate password, may be null
     * @return true if the password meets every rule
     */
    public static boolean isAcceptable(String password) {
        if (password == null) {
            return false;
        }
        if (password.length() < MIN_LENGTH || password.length() > MAX_BYTES) {
            return false;
        }
        if (password.getBytes(StandardCharsets.UTF_8).length > MAX_BYTES) {
            return false;
        }
        return STRONG.matcher(password).matches();
    }
}
