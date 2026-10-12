package com.musketeers.repository;

import com.musketeers.domain.User;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.UUID;

@ApplicationScoped
public class UserRepository implements PanacheRepositoryBase<User, UUID> {
    public User findByEmail(String email) {
        return find("email", email).firstResult();
    }
}
