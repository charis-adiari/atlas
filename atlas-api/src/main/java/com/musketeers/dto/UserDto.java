package com.musketeers.dto;

import java.util.UUID;

/**
 * Represent a user response
 * @param id Identifier of the user
 * @param email Email address of the user
 */
public record UserDto(
        UUID id,
        String email
) {
}
