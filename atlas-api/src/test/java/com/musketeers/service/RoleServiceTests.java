package com.musketeers.service;

import com.musketeers.api.roles.mappers.RoleMapper;
import com.musketeers.domain.Role;
import com.musketeers.dto.RoleDto;
import com.musketeers.repository.RoleRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class RoleServiceTests {
    @Mock
    RoleRepository repository;

    @Mock
    RoleMapper mapper;

    @InjectMocks
    RoleService service;

    @Test
    void getById_ReturnsRole() {
        // Arrange
        long roleId = 1L;
        String roleName = "ADMIN";
        String roleDescription = "Full administrative access";

        Role role = new Role();
        role.id = roleId;
        role.name = roleName;
        role.description = roleDescription;

        when(repository.findById(eq(roleId))).thenReturn(role);
        when(mapper.toDto(role)).thenReturn(new RoleDto(roleId, roleName, roleDescription));

        // Act
        RoleDto result = service.getById(roleId);

        // Assert
        assertEquals(roleId, result.id());
        assertEquals(roleName, result.name());
        assertEquals(roleDescription, result.description());

        verify(repository, times(1)).findById(roleId);
        verify(mapper, times(1)).toDto(role);
    }

    @Test
    void getById_whenNotFound_ThrowsEntityNotFoundException() {
        // Arrange
        when(repository.findById(anyLong())).thenReturn(null);

        // Act & Assert
        EntityNotFoundException ex = assertThrows(
                EntityNotFoundException.class,
                () -> service.getById(99L)
        );
        assertEquals("Role with id 99 not found", ex.getMessage());
    }

}
