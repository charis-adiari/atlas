package com.musketeers.service;

import com.musketeers.domain.User;
import com.musketeers.dto.SignupResponse;
import com.musketeers.repository.UserRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.PersistenceException;
import jakarta.transaction.Transactional;
import org.hibernate.exception.ConstraintViolationException;
import org.jboss.logging.Logger;

import java.util.Locale;

/**
 * Operations for creating accounts and issuing access tokens
 */
@ApplicationScoped
public class AuthService {
    public static final String SIGNUP_FAILED_MESSAGE = "The account could not be created with the details provided.";

    private static final Logger LOGGER = Logger.getLogger(AuthService.class);
    private static final String TOKEN_TYPE = "Bearer";

    private final UserRepository repository;
    private final PasswordHasher hasher;
    private final TokenService tokenService;
    private final EmailVerificationService emailVerificationService;

    public AuthService(
            UserRepository repository,
            PasswordHasher hasher,
            TokenService tokenService,
            EmailVerificationService emailVerificationService
    ) {
        this.repository = repository;
        this.hasher = hasher;
        this.tokenService = tokenService;
        this.emailVerificationService = emailVerificationService;
    }

    /**
     * Creates the account, emails a verification link and signs the new user in. The password must already be
     * validated, which {@code SignupRequest} takes care of. The email is lower-cased here, because the users table only
     * accepts lower-case addresses.
     * <p>
     * The password is hashed before the database is touched, so a refused signup takes as long as a successful one
     * and the response time does not reveal which addresses are registered. A refused signup always carries the same
     * message, whatever the reason, so the response does not reveal it either.
     * <p>
     * A failure to send the verification email does not undo the account: it is logged, and the user can ask for
     * another email while signed in.
     *
     * @throws IllegalArgumentException if the account could not be created, for example because the email is already
     *                                  registered
     */
    @Transactional
    public SignupResponse signup(String email, String password) {
        String normalizedEmail = email.toLowerCase(Locale.ROOT);
        String hash = hasher.hash(password);

        if (repository.findByEmailIgnoreCase(normalizedEmail) != null) {
            throw new IllegalArgumentException(SIGNUP_FAILED_MESSAGE);
        }

        User user = new User();
        user.email = normalizedEmail;
        user.passwordHash = hash;
        save(user);

        sendVerification(user);

        return new SignupResponse(tokenService.issue(user), TOKEN_TYPE, tokenService.getTtlSeconds());
    }

    /**
     * Stores the user and flushes straight away so a duplicate email surfaces here instead of at commit time. The
     * check in {@link #signup} cannot stop two simultaneous signups for the same email, so the UNIQUE constraint on
     * the table is the real guard, and its violation is turned into the same message as any other refused signup.
     *
     * @throws IllegalArgumentException if the database rejected the user because of a constraint
     */
    private void save(User user) {
        try {
            repository.persistAndFlush(user);
        } catch (PersistenceException e) {
            if (e.getCause() instanceof ConstraintViolationException) {
                throw new IllegalArgumentException(SIGNUP_FAILED_MESSAGE);
            }
            throw e;
        }
    }

    /**
     * Creates the verification token and emails it. Only the sending is allowed to fail quietly, because the token is
     * stored in the signup transaction and has to stay consistent with it.
     */
    private void sendVerification(User user) {
        String token = emailVerificationService.createToken(user);
        try {
            emailVerificationService.sendEmail(user, token);
        } catch (RuntimeException e) {
            LOGGER.errorf(e, "The verification email for user %s could not be sent", user.id);
        }
    }
}
