package com.musketeers.service.auth;

import com.musketeers.domain.auth.EmailVerificationCode;
import com.musketeers.repository.auth.EmailVerificationCodeRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;
import java.util.UUID;

/**
 * Proves that a user owns their email address. A random 6-digit code is emailed and its hash is stored. A token
 * works once and until it expires.
 */
@ApplicationScoped
public class VerificationCodeService {
    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private static final int MIN_PEPPER_BYTES = 32;

    private final SecureRandom secureRandom = new SecureRandom();
    private final EmailVerificationCodeRepository emailVerificationCodeRepository;
    private final Duration codeLifetime;
    private final SecretKeySpec pepperKey;

    public VerificationCodeService(
            @ConfigProperty(name = "app.auth.verification.code-pepper") String pepperBase64,
            @ConfigProperty(name = "app.auth.verification.code-lifetime") Duration codeLifetime,
            EmailVerificationCodeRepository emailVerificationCodeRepository) {
        this.emailVerificationCodeRepository = emailVerificationCodeRepository;
        this.codeLifetime = codeLifetime;
        byte[] pepper = Base64.getDecoder().decode(pepperBase64);

        if (pepper.length < MIN_PEPPER_BYTES)
            throw new IllegalStateException(
                    "app.auth.verification.code-pepper must be at least " + MIN_PEPPER_BYTES + " bytes");

        this.pepperKey = new SecretKeySpec(pepper, HMAC_ALGORITHM);
    }

    @Transactional
    public String generateCode(UUID userId) {
        int value = secureRandom.nextInt(1_000_000);
        String codeString = String.format("%06d", value);
        byte[] codeHash = hashCode(userId, codeString);

        Optional<EmailVerificationCode> existingCode = emailVerificationCodeRepository.findByUserId(userId);

        if (existingCode.isEmpty()) {
            EmailVerificationCode code = new EmailVerificationCode(
                    userId,
                    codeHash,
                    Instant.now().plus(codeLifetime));
            emailVerificationCodeRepository.persist(code);
        } else  {
            existingCode.get().codeHash = codeHash;
            existingCode.get().expiresAt = Instant.now().plus(codeLifetime);
            existingCode.get().resendCount++;
            existingCode.get().lastSentAt = Instant.now();
        }

        emailVerificationCodeRepository.flush();

        return codeString;
    }

    /**
     * Returns a 32-byte HMAC-SHA256, bound to the user, for the BYTEA column
     * @param userId
     * @param code
     * @return
     */
    public byte[] hashCode(UUID userId, String code) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(pepperKey);
            return mac.doFinal((userId + ":" + code).getBytes(StandardCharsets.UTF_8));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Failed to hash verification code", e);
        }
    }

    /**
     * Constant-time comparison against the stored hash
     * @param userId
     * @param submittedCode
     * @param storedHash
     * @return
     */
    public boolean matches(UUID userId, String submittedCode, byte[] storedHash) {
        byte[] candidate = hashCode(userId, normalize(submittedCode));
        return MessageDigest.isEqual(candidate, storedHash);
    }

    /**
     * Strips whitespace and hyphens so "123 456" matches "123456"
     * @param input
     * @return
     */
    private String normalize(String input) {
        return input == null ? "" : input.replaceAll("[\\s-]", "");
    }
}
