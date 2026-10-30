package com.musketeers.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Represent a request to email a new verification link.
 * @param email Email address of the account to verify
 */
public record ResendVerificationRequest(
        @NotBlank(message = "Email is required")
        @Size(max = 320, message = "Email is too long")
        @Email(message = "Enter a valid email address")
        String email
) {
}
