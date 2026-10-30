package com.musketeers.service.auth;

import com.musketeers.domain.auth.User;
import com.musketeers.dto.SignupResponse;
import com.musketeers.repository.auth.UserRepository;
import com.musketeers.service.EmailVerificationService;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.PersistenceException;
import jakarta.transaction.Transactional;
import org.hibernate.exception.ConstraintViolationException;

import java.util.Locale;

/**
 * Operations for creating accounts and issuing access tokens
 */
@ApplicationScoped
public class AuthService {
    public static final String SIGNUP_FAILED_MESSAGE = "The account could not be created with the details provided.";

    private static final String TOKEN_TYPE = "Bearer";

    private final UserRepository repository;
    private final PasswordHasher hasher;
    private final TokenService tokenService;
    private final EmailVerificationService emailVerificationService;
    private final VerificationCodeService verificationCodeService;

    public AuthService(
            UserRepository repository,
            PasswordHasher hasher,
            TokenService tokenService,
            EmailVerificationService emailVerificationService,
            VerificationCodeService verificationCodeService
    ) {
        this.repository = repository;
        this.hasher = hasher;
        this.tokenService = tokenService;
        this.emailVerificationService = emailVerificationService;
        this.verificationCodeService = verificationCodeService;
    }

    /**
     * Creates the account, emails a verification link and signs the new user in. The password must already be
     * validated, which {@code SignupRequest} takes care of. The email is lower-cased here, because the users table only
     * accepts lower-case addresses.
     * <p>
     * The password is hashed before the database is touched, so a refused signup takes as long as a successful one
     * and the response time does not reveal which addresses are registered. A refused signup always carries the same
     * message, whatever the reason, so the response does not reveal it either.
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

//        sendVerification(user);

        return new SignupResponse(tokenService.issue(user), TOKEN_TYPE, tokenService.getTtlSeconds());
    }

    /**
     * Stores the user and flushes straight away so a duplicate email surfaces here instead of at commit time. The
     * check in {@link #signup} cannot stop two simultaneous signups for the same email, so the UNIQUE constraint on
     * the table is the real guard, and its violation is turned into the same message as any other refused signup.
     * Depending on the Hibernate version the violation is thrown itself or wrapped in another persistence exception,
     * so both are recognised.
     *
     * @throws IllegalArgumentException if the database rejected the user because of a constraint
     */
    private void save(User user) {
        try {
            repository.persistAndFlush(user);
        } catch (PersistenceException e) {
            if (e instanceof ConstraintViolationException || e.getCause() instanceof ConstraintViolationException) {
                throw new IllegalArgumentException(SIGNUP_FAILED_MESSAGE);
            }
            throw e;
        }
    }

    /**
     * Creates the verification token and emails it.
     */
    private void sendVerification(User user) {
        String token = emailVerificationService.createToken(user);
        emailVerificationService.sendEmail(user, token);
    }

    private void sendVerificationCode(User user) {
        String code = verificationCodeService.generateCode(user.id);

    }
}
