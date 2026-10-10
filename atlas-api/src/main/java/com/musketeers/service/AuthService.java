package com.musketeers.service;

import com.musketeers.api.auth.mappers.UserMapper;
import com.musketeers.domain.User;
import com.musketeers.dto.SignupResponse;
import com.musketeers.exception.SignupFailedException;
import com.musketeers.repository.UserRepository;
import com.musketeers.util.SqlErrors;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

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
     * validated, which {@code SignupRequest} takes care of.
     * <p>
     * The password is hashed before the database is touched. If the email were looked up first and the method returned
     * early, "already registered" would answer in a few milliseconds while a new account takes about 250 ms, and the
     * response time alone would reveal which addresses have accounts.
     *
     * @throws SignupFailedException if the email is already registered
     */
    @Transactional
    public SignupResponse signup(String email, String password) {
        String hash = hasher.hash(password);

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
     * UNIQUE constraint is the only check that is safe when two signups for the same email arrive together.
     *
     * @throws SignupFailedException if the database rejected the email as a duplicate
     */
    private void persist(User user) {
        try {
            repository.persistAndFlush(user);
        } catch (RuntimeException e) {
            if (SqlErrors.isDuplicateEmail(e)) {
                throw new SignupFailedException();
            }
            throw e;
        }
    }
}
