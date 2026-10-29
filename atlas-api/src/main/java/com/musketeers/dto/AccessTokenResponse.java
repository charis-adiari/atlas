package com.musketeers.dto;

/**
 * Represent a signed-in user's access token, returned by login and by email verification. Details about the user are
 * read from the claims inside the token, not sent back here.
 * @param accessToken Signed token the client sends as a bearer token
 * @param tokenType Scheme of the access token
 * @param expiresIn Lifetime of the access token in seconds
 */
public record AccessTokenResponse(
        String accessToken,
        String tokenType,
        long expiresIn
) {
}
