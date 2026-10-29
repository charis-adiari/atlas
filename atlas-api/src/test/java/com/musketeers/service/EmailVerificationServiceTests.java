package com.musketeers.service;

import com.musketeers.domain.EmailVerificationToken;
import com.musketeers.domain.User;
import com.musketeers.repository.EmailVerificationTokenRepository;
import com.musketeers.repository.UserRepository;
import io.quarkus.mailer.Mail;
import io.quarkus.mailer.Mailer;
import jakarta.ws.rs.WebApplicationException;
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
import static org.junit.jupiter.api.Assertions.assertSame;
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
    private static final String CLIENT_ADDRESS = "203.0.113.7";

    @Mock
    EmailVerificationTokenRepository tokenRepository;

    @Mock
    UserRepository userRepository;

    @Mock
    Mailer mailer;

    @Mock
    ResendVerificationLimiter limiter;

    @Captor
    ArgumentCaptor<EmailVerificationToken> storedToken;

    @Captor
    ArgumentCaptor<Mail> sentMail;

    @Captor
    ArgumentCaptor<String> lookedUpHash;

    private EmailVerificationService service;

    @BeforeEach
    void createService() {
        service = new EmailVerificationService(
                tokenRepository, userRepository, mailer, limiter, LIFETIME, PAGE_ADDRESS);
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
        User result = service.verify(TOKEN);

        // Assert
        assertSame(user, result);
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
        allowRequests();
        when(userRepository.findByEmailIgnoreCase(EMAIL)).thenReturn(user);

        // Act
        service.resend("Ada@Example.COM", CLIENT_ADDRESS);

        // Assert
        verify(limiter).tryAcquireForEmail(EMAIL);
        verify(tokenRepository).delete("userId", user.id);
        verify(tokenRepository).persist(storedToken.capture());
        verify(mailer).send(sentMail.capture());
        assertEquals(List.of(EMAIL), sentMail.getValue().getTo());
    }

    @Test
    void resend_WhenEmailIsAlreadyVerified_SendsNothingAndReportsNothing() {
        // Arrange
        User user = user();
        user.emailVerifiedAt = Instant.now();
        allowRequests();
        when(userRepository.findByEmailIgnoreCase(EMAIL)).thenReturn(user);

        // Act
        service.resend(EMAIL, CLIENT_ADDRESS);

        // Assert
        verifyNoInteractions(mailer, tokenRepository);
    }

    @Test
    void resend_WhenNoAccountUsesTheEmail_SendsNothingAndReportsNothing() {
        // Arrange
        allowRequests();
        when(userRepository.findByEmailIgnoreCase(EMAIL)).thenReturn(null);

        // Act
        service.resend(EMAIL, CLIENT_ADDRESS);

        // Assert
        verifyNoInteractions(mailer, tokenRepository);
    }

    @Test
    void resend_WhenTheEmailIsOverItsLimit_QuietlySendsNothing() {
        // Arrange
        when(limiter.tryAcquireForClientAddress(CLIENT_ADDRESS)).thenReturn(true);
        when(limiter.tryAcquireForEmail(EMAIL)).thenReturn(false);

        // Act
        service.resend(EMAIL, CLIENT_ADDRESS);

        // Assert
        verifyNoInteractions(userRepository, mailer, tokenRepository);
    }

    @Test
    void resend_WhenTheClientIsOverItsLimit_ThrowsTooManyRequests() {
        // Arrange
        when(limiter.tryAcquireForClientAddress(CLIENT_ADDRESS)).thenReturn(false);

        // Act
        WebApplicationException ex = assertThrows(
                WebApplicationException.class, () -> service.resend(EMAIL, CLIENT_ADDRESS));

        // Assert
        assertEquals(429, ex.getResponse().getStatus());
        verify(limiter, never()).tryAcquireForEmail(any());
        verifyNoInteractions(userRepository, mailer, tokenRepository);
    }

    private void allowRequests() {
        when(limiter.tryAcquireForClientAddress(CLIENT_ADDRESS)).thenReturn(true);
        when(limiter.tryAcquireForEmail(EMAIL)).thenReturn(true);
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
