package com.musketeers.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Represent a request to verify an email address with the token from the emailed link.
 * @param token Token taken from the verification link
 */
public record VerifyEmailRequest(
        @NotBlank(message = "Verification token is required")
        @Size(max = 200, message = "Verification token is too long")
        String token
) {
}
