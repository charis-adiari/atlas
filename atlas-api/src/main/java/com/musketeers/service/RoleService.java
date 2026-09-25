package com.musketeers.service;

import com.musketeers.api.roles.mappers.RoleMapper;
import com.musketeers.domain.Role;
import com.musketeers.dto.RoleDto;
import com.musketeers.repository.RoleRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityNotFoundException;

@ApplicationScoped
public class RoleService {
    private final RoleRepository repository;
    private final RoleMapper mapper;

    public RoleService(RoleRepository repository, RoleMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    /**
     * Fetch a role by its id.
     *
     * @throws EntityNotFoundException if no role exists with the given id
     */
    public RoleDto getById(Long id) {
        Role role = repository.findById(id);
        if (role == null) throw new EntityNotFoundException("Role with id " + id + " not found");
        return mapper.toDto(role);
    }
}
