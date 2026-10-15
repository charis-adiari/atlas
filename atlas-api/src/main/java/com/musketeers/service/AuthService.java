package com.musketeers.service;

import com.musketeers.api.auth.mappers.UserMapper;
import com.musketeers.domain.User;
import com.musketeers.dto.SignupResponse;
import com.musketeers.exception.EmailAlreadyRegisteredException;
import com.musketeers.repository.UserRepository;
import com.musketeers.util.SqlErrors;
import jakarta.enterprise.context.ApplicationScoped;

/**
 * Operations for creating accounts and issuing access tokens
 */
@ApplicationScoped
public class AuthService {
    private static final String TOKEN_TYPE = "Bearer";

    private final UserRepository repository;
    private final PasswordHasher hasher;
    private final TokenService tokenService;
    private final UserMapper mapper;

    public AuthService(
            UserRepository repository,
            PasswordHasher hasher,
            TokenService tokenService,
            UserMapper mapper
    ) {
        this.repository = repository;
        this.hasher = hasher;
        this.tokenService = tokenService;
        this.mapper = mapper;
    }

    /**
     * Creates the account and signs the new user in. The email must already be normalised and the password already
     * validated, which {@code SignupRequest} takes care of. It runs inside the transaction the controller opens.
     * <p>
     * The password is hashed before the database is touched, so a refused signup takes as long as a successful one
     * and the response time does not reveal which addresses are registered.
     *
     * @throws EmailAlreadyRegisteredException if the email is already registered
     */
    public SignupResponse signup(String email, String password) {
        String hash = hasher.hash(password);

        if (repository.findByEmail(email) != null) {
            throw new EmailAlreadyRegisteredException();
        }

        User user = new User();
        user.email = email;
        user.passwordHash = hash;
        persist(user);

        return new SignupResponse(
                mapper.toDto(user),
                tokenService.issue(user),
                TOKEN_TYPE,
                tokenService.getTtlSeconds()
        );
    }

    /**
     * Stores the user and flushes straight away so a duplicate email surfaces here instead of at commit time. The
     * check in {@link #signup} cannot stop two simultaneous signups for the same email, so the UNIQUE constraint on
     * the table is the real guard and its violation is translated to the same exception.
     *
     * @throws EmailAlreadyRegisteredException if the database rejected the email as a duplicate
     */
    private void persist(User user) {
        try {
            repository.persistAndFlush(user);
        } catch (RuntimeException e) {
            if (SqlErrors.isDuplicateEmail(e)) {
                throw new EmailAlreadyRegisteredException();
            }
            throw e;
        }
    }
}
