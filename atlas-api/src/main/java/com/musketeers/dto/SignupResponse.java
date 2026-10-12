package com.musketeers.dto;

/**
 * Represent a signup response
 * @param user The account that was created
 * @param accessToken Signed JWT the client sends as a bearer token
 * @param tokenType Scheme of the access token
 * @param expiresIn Lifetime of the access token in seconds
 */
public record SignupResponse(
        UserDto user,
        String accessToken,
        String tokenType,
        long expiresIn
) {
}
