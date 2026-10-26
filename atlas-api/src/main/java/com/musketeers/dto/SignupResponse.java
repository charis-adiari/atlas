package com.musketeers.dto;

/**
 * Represent a signup response. The new user is signed in straight away, so the response only carries the access token.
 * Details about the user are read from the claims inside the token, not sent back here.
 * @param accessToken Signed token the client sends as a bearer token
 * @param tokenType Scheme of the access token
 * @param expiresIn Lifetime of the access token in seconds
 */
public record SignupResponse(
        String accessToken,
        String tokenType,
        long expiresIn
) {
}
