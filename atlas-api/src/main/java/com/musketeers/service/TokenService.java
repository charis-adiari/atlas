package com.musketeers.service;

import com.musketeers.domain.User;
import io.smallrye.jwt.build.Jwt;
import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.time.Duration;

/**
 * Issues access tokens. The signing key comes from smallrye.jwt.sign.key.location (an RSA private key in PKCS#8 PEM
 * format); the matching public key is what protected endpoints will verify against.
 */
@ApplicationScoped
public class TokenService {
    private static final String USER_GROUP = "user";

    private final String issuer;
    private final Duration ttl;

    public TokenService(
            @ConfigProperty(name = "app.auth.issuer") String issuer,
            @ConfigProperty(name = "app.auth.token-ttl", defaultValue = "PT1H") Duration ttl
    ) {
        this.issuer = issuer;
        this.ttl = ttl;
    }

    /**
     * Issues a signed access token for a user.
     *
     * @param user the authenticated user, whose id becomes the subject
     * @return the compact serialised JWT
     */
    public String issue(User user) {
        return Jwt.issuer(issuer)
                .subject(user.id.toString())
                .groups(USER_GROUP)
                .claim("email", user.email)
                .expiresIn(ttl)
                .sign();
    }

    /**
     * Gets the lifetime of an issued token.
     *
     * @return the lifetime in seconds
     */
    public long getTtlSeconds() {
        return ttl.toSeconds();
    }
}
