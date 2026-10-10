package com.musketeers.api.auth.mappers;

import com.musketeers.domain.User;
import com.musketeers.dto.UserDto;
import org.mapstruct.Mapper;

@Mapper(componentModel = "cdi")
public interface UserMapper {
    UserDto toDto(User user);
}
