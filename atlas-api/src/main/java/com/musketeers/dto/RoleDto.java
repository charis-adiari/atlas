package com.musketeers.dto;

/**
 * Represent a role response
 * @param id identifier of the role
 * @param name Name of the role
 * @param description Description of the role
 */
public record RoleDto(
        Long id,
        String name,
        String description
) {
}
