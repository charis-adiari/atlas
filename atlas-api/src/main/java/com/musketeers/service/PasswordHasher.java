package com.musketeers.service;

import io.quarkus.elytron.security.common.BcryptUtil;
import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;

/**
 * The only class that knows how passwords are hashed. The bcrypt output carries its own salt and cost, so the stored
 * string is all that is needed to verify a password later.
 */
@ApplicationScoped
public class PasswordHasher {
    private final int cost;

    public PasswordHasher(@ConfigProperty(name = "app.auth.bcrypt-cost", defaultValue = "12") int cost) {
        this.cost = cost;
    }

    /**
     * Hashes a password with bcrypt. The cost is the log2 of the rounds; 12 takes roughly a quarter of a second on
     * current hardware.
     *
     * @param password the plain-text password
     * @return the bcrypt hash, including its salt and cost
     */
    public String hash(String password) {
        return BcryptUtil.bcryptHash(password, cost);
    }
}
