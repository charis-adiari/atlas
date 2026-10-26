package com.musketeers.service;

import com.musketeers.domain.User;
import com.musketeers.dto.SignupResponse;
import com.musketeers.repository.UserRepository;
import jakarta.persistence.PersistenceException;
import org.hibernate.exception.ConstraintViolationException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class AuthServiceTests {
    private static final String EMAIL = "ada@example.com";
    private static final String PASSWORD = "Str0ng!Pass";
    private static final String HASH = "$2a$12$hashed";
    private static final String ACCESS_TOKEN = "signed-access-token";
    private static final String VERIFICATION_TOKEN = "verification-token";
    private static final long TTL_SECONDS = 3600L;

    @Mock
    UserRepository repository;

    @Mock
    PasswordHasher hasher;

    @Mock
    TokenService tokenService;

    @Mock
    EmailVerificationService emailVerificationService;

    @InjectMocks
    AuthService service;

    @Captor
    ArgumentCaptor<User> saved;

    @Test
    void signup_ReturnsAccessTokenWithoutUserDetails() {
        // Arrange
        when(hasher.hash(PASSWORD)).thenReturn(HASH);
        when(tokenService.issue(any(User.class))).thenReturn(ACCESS_TOKEN);
        when(tokenService.getTtlSeconds()).thenReturn(TTL_SECONDS);

        // Act
        SignupResponse result = service.signup(EMAIL, PASSWORD);

        // Assert
        assertEquals(ACCESS_TOKEN, result.accessToken());
        assertEquals("Bearer", result.tokenType());
        assertEquals(TTL_SECONDS, result.expiresIn());
    }

    @Test
    void signup_StoresTheHashAndNeverThePassword() {
        // Arrange
        when(hasher.hash(PASSWORD)).thenReturn(HASH);

        // Act
        service.signup(EMAIL, PASSWORD);

        // Assert
        verify(repository).persistAndFlush(saved.capture());
        assertEquals(EMAIL, saved.getValue().email);
        assertEquals(HASH, saved.getValue().passwordHash);
    }

    @Test
    void signup_WhenEmailHasCapitals_LooksItUpAndStoresItLowerCased() {
        // Arrange
        when(hasher.hash(PASSWORD)).thenReturn(HASH);

        // Act
        service.signup("Ada@Example.COM", PASSWORD);

        // Assert
        verify(repository).findByEmailIgnoreCase(EMAIL);
        verify(repository).persistAndFlush(saved.capture());
        assertEquals(EMAIL, saved.getValue().email);
    }

    @Test
    void signup_HashesThePasswordBeforeTouchingTheDatabase() {
        // Arrange
        when(hasher.hash(PASSWORD)).thenReturn(HASH);

        // Act
        service.signup(EMAIL, PASSWORD);

        // Assert
        InOrder order = inOrder(hasher, repository);
        order.verify(hasher).hash(PASSWORD);
        order.verify(repository).findByEmailIgnoreCase(EMAIL);
        order.verify(repository).persistAndFlush(any(User.class));
    }

    @Test
    void signup_EmailsTheVerificationTokenToTheNewUser() {
        // Arrange
        when(hasher.hash(PASSWORD)).thenReturn(HASH);
        when(emailVerificationService.createToken(any(User.class))).thenReturn(VERIFICATION_TOKEN);

        // Act
        service.signup(EMAIL, PASSWORD);

        // Assert
        verify(emailVerificationService).sendEmail(saved.capture(), eq(VERIFICATION_TOKEN));
        assertEquals(EMAIL, saved.getValue().email);
    }

    @Test
    void signup_WhenVerificationEmailCannotBeSent_StillReturnsAccessToken() {
        // Arrange
        when(hasher.hash(PASSWORD)).thenReturn(HASH);
        when(tokenService.issue(any(User.class))).thenReturn(ACCESS_TOKEN);
        doThrow(new RuntimeException("mail server is down")).when(emailVerificationService)
                .sendEmail(any(User.class), any());

        // Act
        SignupResponse result = service.signup(EMAIL, PASSWORD);

        // Assert
        assertEquals(ACCESS_TOKEN, result.accessToken());
    }

    @Test
    void signup_WhenEmailIsAlreadyRegistered_ThrowsIllegalArgumentExceptionWithGenericMessage() {
        // Arrange
        when(hasher.hash(PASSWORD)).thenReturn(HASH);
        when(repository.findByEmailIgnoreCase(EMAIL)).thenReturn(new User());

        // Act
        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> service.signup(EMAIL, PASSWORD)
        );

        // Assert
        assertEquals(AuthService.SIGNUP_FAILED_MESSAGE, ex.getMessage());
        verify(repository, never()).persistAndFlush(any(User.class));
        verifyNoInteractions(tokenService, emailVerificationService);
    }

    @Test
    void signup_WhenConstraintFailsDuringSimultaneousSignup_ThrowsIllegalArgumentExceptionWithGenericMessage() {
        // Arrange
        when(hasher.hash(PASSWORD)).thenReturn(HASH);
        PersistenceException duplicate = new PersistenceException(mock(ConstraintViolationException.class));
        doThrow(duplicate).when(repository).persistAndFlush(any(User.class));

        // Act
        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> service.signup(EMAIL, PASSWORD)
        );

        // Assert
        assertEquals(AuthService.SIGNUP_FAILED_MESSAGE, ex.getMessage());
        verifyNoInteractions(tokenService, emailVerificationService);
    }

    @Test
    void signup_WhenTheConstraintViolationIsThrownItself_ThrowsIllegalArgumentExceptionWithGenericMessage() {
        // Arrange
        when(hasher.hash(PASSWORD)).thenReturn(HASH);
        doThrow(mock(ConstraintViolationException.class)).when(repository).persistAndFlush(any(User.class));

        // Act
        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> service.signup(EMAIL, PASSWORD)
        );

        // Assert
        assertEquals(AuthService.SIGNUP_FAILED_MESSAGE, ex.getMessage());
        verifyNoInteractions(tokenService, emailVerificationService);
    }

    @Test
    void signup_WhenDatabaseFailsForAnotherReason_RethrowsTheError() {
        // Arrange
        when(hasher.hash(PASSWORD)).thenReturn(HASH);
        PersistenceException failure = new PersistenceException("connection lost");
        doThrow(failure).when(repository).persistAndFlush(any(User.class));

        // Act
        PersistenceException thrown = assertThrows(PersistenceException.class, () -> service.signup(EMAIL, PASSWORD));

        // Assert
        assertSame(failure, thrown);
        verifyNoInteractions(tokenService, emailVerificationService);
    }
}
