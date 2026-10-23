package com.musketeers.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Represent whether the signed-in user has verified their email address
 * @param isVerified True once the emailed verification link has been opened
 */
public record VerificationStatusResponse(
        @JsonProperty("isVerified")
        boolean isVerified
) {
}
