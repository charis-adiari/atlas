package com.musketeers.dto;

import com.musketeers.util.Emails;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Represent a signup request. The email is trimmed and lower-cased on construction, because the users table only
 * accepts addresses in that form. The password needs 8 or more characters with an upper-case letter, a lower-case
 * letter, a digit and a special character, and at most 72, because bcrypt ignores anything beyond that.
 * @param email Email address of the new account
 * @param password Plain-text password, never logged
 */
public record SignupRequest(
        @NotBlank(message = "Email is required")
        @Size(max = 320, message = "Email is too long")
        @Email(message = "Enter a valid email address")
        String email,

        @NotBlank(message = "Password is required")
        @Size(max = 72, message = "Password must be at most 72 characters")
        @Pattern(
                regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,}$",
                message = "Password must be 8+ chars with upper, lower, digit and special character")
        String password
) {
    public SignupRequest {
        email = Emails.normalize(email);
    }

    /**
     * Prints the email only, so the password never reaches a log line.
     */
    @Override
    public String toString() {
        return "SignupRequest[email=" + email + ", password=***]";
    }
}
