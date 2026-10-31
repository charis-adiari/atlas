package com.musketeers.service;

import com.musketeers.domain.EmailVerificationToken;
import com.musketeers.domain.auth.User;
import com.musketeers.repository.EmailVerificationTokenRepository;
import com.musketeers.repository.auth.UserRepository;
import io.quarkus.mailer.Mail;
import io.quarkus.mailer.Mailer;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;

/**
 * Proves that a user owns their email address. A random token is emailed as a link and only its hash is stored, so the
 * table alone cannot be used to verify anyone. A token works once and until it expires. Neither the token lifetime nor
 * the address of the page the link opens has a default: the application refuses to start when either is missing from
 * the configuration.
 */
@ApplicationScoped
public class EmailVerificationService {
    public static final String INVALID_LINK_MESSAGE = "The verification link is invalid or has expired.";
    public static final String TOO_MANY_REQUESTS_MESSAGE = "Too many requests. Try again later.";

    private static final String SUBJECT = "Verify your email address for Atlas";
    private static final int TOKEN_BYTE_COUNT = 32;
    private static final String HASH_ALGORITHM = "SHA-256";

    private final EmailVerificationTokenRepository tokenRepository;
    private final UserRepository userRepository;
    private final Mailer mailer;
    private final ResendVerificationLimiter limiter;
    private final Duration tokenLifetime;
    private final String pageAddress;
    private final SecureRandom random = new SecureRandom();

    public EmailVerificationService(
            EmailVerificationTokenRepository tokenRepository,
            UserRepository userRepository,
            Mailer mailer,
            ResendVerificationLimiter limiter,
            @ConfigProperty(name = "app.auth.verification-token-lifetime") Duration tokenLifetime,
            @ConfigProperty(name = "app.auth.verification-page-address") String pageAddress
    ) {
        this.tokenRepository = tokenRepository;
        this.userRepository = userRepository;
        this.mailer = mailer;
        this.limiter = limiter;
        this.tokenLifetime = tokenLifetime;
        this.pageAddress = pageAddress;
    }

    /**
     * Creates a new verification token for the user and removes any earlier one, so only the latest link works.
     *
     * @param user the user to verify, who must already be stored
     * @return the token to put in the emailed link, which is the only time it exists in readable form
     */
    @Transactional
    public String createToken(User user) {
        tokenRepository.delete("userId", user.id);

        String token = generateToken();
        EmailVerificationToken stored = new EmailVerificationToken();
        stored.userId = user.id;
        stored.tokenHash = hash(token);
        stored.expiresAt = Instant.now().plus(tokenLifetime);
        tokenRepository.persist(stored);

        return token;
    }

    /**
     * Emails the user a link that opens the verification page with the token in the fragment (after the #). A
     * fragment is never sent to a server and never appears in a referrer header, unlike a query string, so the token
     * stays out of server logs and out of requests the page makes. The page reads it in the browser.
     *
     * @param user the user to email
     * @param token the token returned by {@link #createToken}
     */
    public void sendEmail(User user, String token) {
        String text = """
                Welcome to Atlas!

                Open this link to verify your email address:
                %s#token=%s

                The link works once and stops working after %d hours. If you did not create an account, you can \
                ignore this message.
                """.formatted(pageAddress, token, tokenLifetime.toHours());

        mailer.send(Mail.withText(user.email, SUBJECT, text));
    }

    /**
     * Marks the owner of the token as verified and uses the token up. Verifying an address that is already verified
     * keeps the original verification time.
     *
     * @param token the token taken from the emailed link
     * @return the user who is now verified
     * @throws IllegalArgumentException if the token is unknown, has been used or has expired
     */
    @Transactional
    public User verify(String token) {
        EmailVerificationToken stored = tokenRepository.findByTokenHash(hash(token));
        if (stored == null || stored.expiresAt.isBefore(Instant.now())) {
            throw new IllegalArgumentException(INVALID_LINK_MESSAGE);
        }
        User user = userRepository.findById(stored.userId);
        if (user == null) {
            throw new IllegalArgumentException(INVALID_LINK_MESSAGE);
        }

        if (user.emailVerifiedAt == null) {
            user.emailVerifiedAt = Instant.now();
        }
        tokenRepository.delete("id", stored.id);
        return user;
    }

    /**
     * Emails a fresh verification link to the account that uses the address, if there is one and it is not verified
     * yet. The earlier link stops working. Nothing tells the caller whether an email went out, so the endpoint cannot
     * be used to find out which addresses are registered. Past the per-address limit the request is quietly dropped
     * for the same reason; past the per-client limit it is refused, which reveals nothing about the address.
     *
     * @param email the address to send the link to, in any capitalisation
     * @param clientAddress IP address the request came from
     * @throws WebApplicationException with status 429 if the client has made too many requests
     */
    @Transactional
    public void resend(String email, String clientAddress) {
        if (!limiter.tryAcquireForClientAddress(clientAddress)) {
            throw new WebApplicationException(TOO_MANY_REQUESTS_MESSAGE, Response.Status.TOO_MANY_REQUESTS);
        }
        String normalizedEmail = email.toLowerCase(Locale.ROOT);
        if (!limiter.tryAcquireForEmail(normalizedEmail)) {
            return;
        }

        User user = userRepository.findByEmailIgnoreCase(normalizedEmail);
        if (user == null || user.emailVerifiedAt != null) {
            return;
        }
        sendEmail(user, createToken(user));
    }

    /**
     * Generates a random token that is safe to put in a link.
     */
    private String generateToken() {
        byte[] bytes = new byte[TOKEN_BYTE_COUNT];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    /**
     * Hashes a token the way it is stored, as lower-case hexadecimal text. A fast hash is enough here, because the
     * token is long and random rather than chosen by a person.
     */
    private static String hash(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance(HASH_ALGORITHM);
            return HexFormat.of().formatHex(digest.digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("The " + HASH_ALGORITHM + " algorithm is not available", e);
        }
    }
}
