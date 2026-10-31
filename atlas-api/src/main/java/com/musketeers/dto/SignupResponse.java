package com.musketeers.dto;

/**
 * Represent a signup response. The new user is not signed in until they open the emailed verification link, so the
 * response carries no access token.
 * @param status Always {@value #VERIFICATION_REQUIRED}
 * @param email Address the verification link was sent to, lower-cased
 */
public record SignupResponse(
        String status,
        String email
) {
    public static final String VERIFICATION_REQUIRED = "verification_required";
}
