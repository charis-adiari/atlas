package com.musketeers.dto;

import com.musketeers.util.Emails;
import com.musketeers.validation.StrongPassword;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Represent a signup request. The email is trimmed and lower-cased on construction, so validation and the database
 * both see the normalised address.
 * @param email Email address of the new account
 * @param password Plain-text password, checked against the password policy and never logged
 */
public record SignupRequest(
        @NotBlank(message = "Email is required")
        @Size(max = 320, message = "Email is too long")
        @Email(regexp = "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$", message = "Enter a valid email address")
        String email,

        @NotNull(message = "Password is required")
        @StrongPassword
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
