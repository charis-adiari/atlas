package com.musketeers.service.auth;

import com.musketeers.domain.auth.User;
import com.musketeers.dto.AccessTokenResponse;
import com.musketeers.dto.SignupResponse;
import com.musketeers.repository.auth.UserRepository;
import com.musketeers.service.EmailVerificationService;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.PersistenceException;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.NotAuthorizedException;
import org.hibernate.exception.ConstraintViolationException;

import java.util.Locale;

/**
 * Operations for creating accounts and issuing access tokens. An access token is only ever issued to a user whose
 * email address is verified.
 */
@ApplicationScoped
public class AuthService {
    public static final String SIGNUP_FAILED_MESSAGE = "The account could not be created with the details provided.";
    public static final String INVALID_CREDENTIALS_MESSAGE = "The email or password is incorrect.";
    public static final String EMAIL_NOT_VERIFIED_MESSAGE = "Verify your email address before signing in.";

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
     * Creates the account and emails a verification link. The new user is not signed in: they get an access token once
     * they open the link, through {@link #verifyEmail}. The password must already be
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

        return new SignupResponse(SignupResponse.VERIFICATION_REQUIRED, normalizedEmail);
    }

    /**
     * Verifies the email address the token was sent to and signs its owner in.
     *
     * @param token the token taken from the emailed link
     * @return an access token for the verified user
     * @throws IllegalArgumentException if the token is unknown, has been used or has expired
     */
    public AccessTokenResponse verifyEmail(String token) {
        User user = emailVerificationService.verify(token);
        return issueAccessToken(user);
    }

    /**
     * Signs a user in. The password is checked before anything else, and an unknown address costs the same bcrypt
     * work as a wrong password, so neither the response nor its timing reveals whether an account exists, or whether
     * it is verified, to someone who does not know the password.
     *
     * @param email the address of the account, in any capitalisation
     * @param password the plain-text password
     * @return an access token for the user
     * @throws NotAuthorizedException if no account uses the address or the password is wrong
     * @throws IllegalArgumentException if the password is right but the address is not verified yet
     */
    public AccessTokenResponse login(String email, String password) {
        User user = repository.findByEmailIgnoreCase(email.toLowerCase(Locale.ROOT));

        if (!hasher.matches(password, user == null ? null : user.passwordHash)) {
            throw new NotAuthorizedException(INVALID_CREDENTIALS_MESSAGE, TOKEN_TYPE);
        }
        if (user.emailVerifiedAt == null) {
            throw new IllegalArgumentException(EMAIL_NOT_VERIFIED_MESSAGE);
        }
        return issueAccessToken(user);
    }

    private AccessTokenResponse issueAccessToken(User user) {
        return new AccessTokenResponse(tokenService.issue(user), TOKEN_TYPE, tokenService.getTtlSeconds());
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
