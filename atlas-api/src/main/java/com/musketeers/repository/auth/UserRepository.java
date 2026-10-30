package com.musketeers.repository.auth;

import com.musketeers.domain.auth.User;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@ApplicationScoped
public class UserRepository implements PanacheRepositoryBase<User, UUID> {
    /**
     * Finds the user with the given email address, whatever the capitalisation of either side.
     *
     * @param email the address to look for
     * @return the user, or null if no account uses the address
     */
    public User findByEmailIgnoreCase(String email) {
        return find("lower(email) = :email", Map.of("email", email.toLowerCase(Locale.ROOT))).firstResult();
    }
}
