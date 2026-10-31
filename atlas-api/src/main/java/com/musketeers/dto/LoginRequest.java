package com.musketeers.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Represent a login request. Only the limits that every stored password already meets are checked here, so the
 * response never hints at the password rules of a particular account.
 * @param email Email address of the account
 * @param password Plain-text password, never logged
 */
public record LoginRequest(
        @NotBlank(message = "Email is required")
        @Size(max = 320, message = "Email is too long")
        String email,

        @NotBlank(message = "Password is required")
        @MaxUtf8Bytes(value = 72, message = "Password is too long")
        String password
) {
    /**
     * Prints the email only, so the password never reaches a log line.
     */
    @Override
    public String toString() {
        return "LoginRequest[email=" + email + ", password=***]";
    }
}
