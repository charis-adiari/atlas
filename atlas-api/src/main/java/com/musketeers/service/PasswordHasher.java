package com.musketeers.service;

import io.quarkus.elytron.security.common.BcryptUtil;
import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;

/**
 * The only class that knows how passwords are hashed. The bcrypt output carries its own salt and cost, so the stored
 * string is all that is needed to verify a password later. The cost has no default: the application refuses to start
 * when app.auth.bcrypt-cost is missing from the configuration.
 */
@ApplicationScoped
public class PasswordHasher {
    private final int cost;
    private final String unmatchableHash;

    public PasswordHasher(@ConfigProperty(name = "app.auth.bcrypt-cost") int cost) {
        this.cost = cost;
        this.unmatchableHash = BcryptUtil.bcryptHash("no password is checked against this", cost);
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

    /**
     * Checks a password against a stored hash. When there is no stored hash, because no account uses the address, the
     * password is still checked against a throwaway hash of the same cost, so the response time does not reveal which
     * addresses are registered.
     *
     * @param password the plain-text password
     * @param hash the stored bcrypt hash, or null when there is no account
     * @return true only if there is a hash and the password matches it
     */
    public boolean matches(String password, String hash) {
        if (hash == null) {
            BcryptUtil.matches(password, unmatchableHash);
            return false;
        }
        return BcryptUtil.matches(password, hash);
    }
}
