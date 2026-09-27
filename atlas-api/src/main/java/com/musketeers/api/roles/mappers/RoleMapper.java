package com.musketeers.api.roles.mappers;

import com.musketeers.domain.Role;
import com.musketeers.dto.RoleDto;
import org.mapstruct.Mapper;

@Mapper(componentModel = "cdi")
public interface RoleMapper {
    RoleDto toDto(Role role);
}
