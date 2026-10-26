package com.musketeers.service;

import com.musketeers.domain.EmailVerificationToken;
import com.musketeers.domain.User;
import com.musketeers.repository.EmailVerificationTokenRepository;
import com.musketeers.repository.UserRepository;
import io.quarkus.mailer.Mail;
import io.quarkus.mailer.Mailer;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class EmailVerificationServiceTests {
    private static final String EMAIL = "ada@example.com";
    private static final String PAGE_ADDRESS = "http://localhost:3000/verify-email";
    private static final Duration LIFETIME = Duration.ofHours(24);
    private static final String TOKEN = "token-from-the-link";
    private static final int HASH_LENGTH = 64;

    @Mock
    EmailVerificationTokenRepository tokenRepository;

    @Mock
    UserRepository userRepository;

    @Mock
    Mailer mailer;

    @Captor
    ArgumentCaptor<EmailVerificationToken> storedToken;

    @Captor
    ArgumentCaptor<Mail> sentMail;

    @Captor
    ArgumentCaptor<String> lookedUpHash;

    private EmailVerificationService service;

    @BeforeEach
    void createService() {
        service = new EmailVerificationService(tokenRepository, userRepository, mailer, LIFETIME, PAGE_ADDRESS);
    }

    @Test
    void createToken_StoresTheHashOfTheTokenAndNotTheToken() {
        // Arrange
        User user = user();

        // Act
        String token = service.createToken(user);

        // Assert
        verify(tokenRepository).persist(storedToken.capture());
        assertEquals(user.id, storedToken.getValue().userId);
        assertNotEquals(token, storedToken.getValue().tokenHash);
        assertEquals(HASH_LENGTH, storedToken.getValue().tokenHash.length());
        assertFalse(token.isBlank());
    }

    @Test
    void createToken_ExpiresAfterTheConfiguredLifetime() {
        // Arrange
        Instant before = Instant.now();

        // Act
        service.createToken(user());

        // Assert
        Instant after = Instant.now();
        verify(tokenRepository).persist(storedToken.capture());
        Instant expiresAt = storedToken.getValue().expiresAt;
        assertFalse(expiresAt.isBefore(before.plus(LIFETIME)));
        assertFalse(expiresAt.isAfter(after.plus(LIFETIME)));
    }

    @Test
    void createToken_RemovesEarlierTokensOfTheUser() {
        // Arrange
        User user = user();

        // Act
        service.createToken(user);

        // Assert
        verify(tokenRepository).delete("userId", user.id);
    }

    @Test
    void createToken_GivesADifferentTokenEachTime() {
        // Arrange
        User user = user();

        // Act
        String first = service.createToken(user);
        String second = service.createToken(user);

        // Assert
        assertNotEquals(first, second);
    }

    @Test
    void sendEmail_SendsALinkWithTheTokenToTheUser() {
        // Arrange
        User user = user();

        // Act
        service.sendEmail(user, TOKEN);

        // Assert
        verify(mailer).send(sentMail.capture());
        assertEquals(List.of(EMAIL), sentMail.getValue().getTo());
        assertTrue(sentMail.getValue().getText().contains(PAGE_ADDRESS + "#token=" + TOKEN));
        assertTrue(sentMail.getValue().getText().contains("24 hours"));
    }

    @Test
    void verify_WhenTokenIsValid_MarksTheEmailVerifiedAndUsesTheTokenUp() {
        // Arrange
        User user = user();
        EmailVerificationToken stored = tokenFor(user, Instant.now().plusSeconds(60));
        when(tokenRepository.findByTokenHash(any())).thenReturn(stored);
        when(userRepository.findById(user.id)).thenReturn(user);

        // Act
        service.verify(TOKEN);

        // Assert
        assertNotNull(user.emailVerifiedAt);
        verify(tokenRepository).delete("id", stored.id);
        verify(tokenRepository).findByTokenHash(lookedUpHash.capture());
        assertNotEquals(TOKEN, lookedUpHash.getValue());
        assertEquals(HASH_LENGTH, lookedUpHash.getValue().length());
    }

    @Test
    void verify_WhenEmailIsAlreadyVerified_KeepsTheOriginalVerificationTime() {
        // Arrange
        User user = user();
        Instant verifiedAt = Instant.parse("2025-01-02T03:04:05Z");
        user.emailVerifiedAt = verifiedAt;
        when(tokenRepository.findByTokenHash(any())).thenReturn(tokenFor(user, Instant.now().plusSeconds(60)));
        when(userRepository.findById(user.id)).thenReturn(user);

        // Act
        service.verify(TOKEN);

        // Assert
        assertEquals(verifiedAt, user.emailVerifiedAt);
    }

    @Test
    void verify_WhenTokenIsUnknown_ThrowsIllegalArgumentException() {
        // Arrange
        when(tokenRepository.findByTokenHash(any())).thenReturn(null);

        // Act
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> service.verify(TOKEN));

        // Assert
        assertEquals(EmailVerificationService.INVALID_LINK_MESSAGE, ex.getMessage());
        verifyNoInteractions(userRepository);
    }

    @Test
    void verify_WhenTokenHasExpired_ThrowsIllegalArgumentExceptionAndLeavesTheUserUnverified() {
        // Arrange
        User user = user();
        when(tokenRepository.findByTokenHash(any())).thenReturn(tokenFor(user, Instant.now().minusSeconds(1)));

        // Act
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> service.verify(TOKEN));

        // Assert
        assertEquals(EmailVerificationService.INVALID_LINK_MESSAGE, ex.getMessage());
        assertNull(user.emailVerifiedAt);
        verifyNoInteractions(userRepository);
    }

    @Test
    void verify_WhenTheUserNoLongerExists_ThrowsIllegalArgumentException() {
        // Arrange
        User user = user();
        when(tokenRepository.findByTokenHash(any())).thenReturn(tokenFor(user, Instant.now().plusSeconds(60)));
        when(userRepository.findById(user.id)).thenReturn(null);

        // Act
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> service.verify(TOKEN));

        // Assert
        assertEquals(EmailVerificationService.INVALID_LINK_MESSAGE, ex.getMessage());
    }

    @Test
    void resend_SendsANewLinkAndReplacesTheEarlierToken() {
        // Arrange
        User user = user();
        when(userRepository.findById(user.id)).thenReturn(user);

        // Act
        service.resend(user.id);

        // Assert
        verify(tokenRepository).delete("userId", user.id);
        verify(tokenRepository).persist(storedToken.capture());
        verify(mailer).send(sentMail.capture());
        assertEquals(List.of(EMAIL), sentMail.getValue().getTo());
    }

    @Test
    void resend_WhenEmailIsAlreadyVerified_ThrowsIllegalArgumentException() {
        // Arrange
        User user = user();
        user.emailVerifiedAt = Instant.now();
        when(userRepository.findById(user.id)).thenReturn(user);

        // Act
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> service.resend(user.id));

        // Assert
        assertEquals(EmailVerificationService.ALREADY_VERIFIED_MESSAGE, ex.getMessage());
        verifyNoInteractions(mailer, tokenRepository);
    }

    @Test
    void resend_WhenTheUserNoLongerExists_ThrowsEntityNotFoundException() {
        // Arrange
        UUID userId = UUID.randomUUID();
        when(userRepository.findById(userId)).thenReturn(null);

        // Act & Assert
        assertThrows(EntityNotFoundException.class, () -> service.resend(userId));
        verify(mailer, never()).send(any(Mail.class));
    }

    @Test
    void isVerified_WhenTheEmailWasVerified_ReturnsTrue() {
        // Arrange
        User user = user();
        user.emailVerifiedAt = Instant.now();
        when(userRepository.findById(user.id)).thenReturn(user);

        // Act
        boolean result = service.isVerified(user.id);

        // Assert
        assertTrue(result);
    }

    @Test
    void isVerified_WhenTheEmailWasNotVerified_ReturnsFalse() {
        // Arrange
        User user = user();
        when(userRepository.findById(user.id)).thenReturn(user);

        // Act
        boolean result = service.isVerified(user.id);

        // Assert
        assertFalse(result);
    }

    @Test
    void isVerified_WhenTheUserNoLongerExists_ThrowsEntityNotFoundException() {
        // Arrange
        UUID userId = UUID.randomUUID();
        when(userRepository.findById(userId)).thenReturn(null);

        // Act & Assert
        assertThrows(EntityNotFoundException.class, () -> service.isVerified(userId));
    }

    private static User user() {
        User user = new User();
        user.id = UUID.randomUUID();
        user.email = EMAIL;
        return user;
    }

    private static EmailVerificationToken tokenFor(User user, Instant expiresAt) {
        EmailVerificationToken token = new EmailVerificationToken();
        token.id = UUID.randomUUID();
        token.userId = user.id;
        token.expiresAt = expiresAt;
        return token;
    }
}
