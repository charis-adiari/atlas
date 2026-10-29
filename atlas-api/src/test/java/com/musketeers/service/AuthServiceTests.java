package com.musketeers.service;

import com.musketeers.domain.User;
import com.musketeers.dto.AccessTokenResponse;
import com.musketeers.dto.SignupResponse;
import com.musketeers.repository.UserRepository;
import jakarta.persistence.PersistenceException;
import jakarta.ws.rs.NotAuthorizedException;
import org.hibernate.exception.ConstraintViolationException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;

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
    void signup_ReportsThatVerificationIsRequiredAndIssuesNoAccessToken() {
        // Arrange
        when(hasher.hash(PASSWORD)).thenReturn(HASH);

        // Act
        SignupResponse result = service.signup("Ada@Example.COM", PASSWORD);

        // Assert
        assertEquals(SignupResponse.VERIFICATION_REQUIRED, result.status());
        assertEquals(EMAIL, result.email());
        verifyNoInteractions(tokenService);
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

    @Test
    void verifyEmail_IssuesAnAccessTokenForTheVerifiedUser() {
        // Arrange
        User user = verifiedUser();
        when(emailVerificationService.verify(VERIFICATION_TOKEN)).thenReturn(user);
        when(tokenService.issue(user)).thenReturn(ACCESS_TOKEN);
        when(tokenService.getTtlSeconds()).thenReturn(TTL_SECONDS);

        // Act
        AccessTokenResponse result = service.verifyEmail(VERIFICATION_TOKEN);

        // Assert
        assertEquals(ACCESS_TOKEN, result.accessToken());
        assertEquals("Bearer", result.tokenType());
        assertEquals(TTL_SECONDS, result.expiresIn());
    }

    @Test
    void verifyEmail_WhenTheTokenIsRejected_IssuesNoAccessToken() {
        // Arrange
        when(emailVerificationService.verify(VERIFICATION_TOKEN)).thenThrow(new IllegalArgumentException("bad"));

        // Act & Assert
        assertThrows(IllegalArgumentException.class, () -> service.verifyEmail(VERIFICATION_TOKEN));
        verifyNoInteractions(tokenService);
    }

    @Test
    void login_WhenPasswordIsRightAndEmailIsVerified_IssuesAnAccessToken() {
        // Arrange
        User user = verifiedUser();
        when(repository.findByEmailIgnoreCase(EMAIL)).thenReturn(user);
        when(hasher.matches(PASSWORD, HASH)).thenReturn(true);
        when(tokenService.issue(user)).thenReturn(ACCESS_TOKEN);
        when(tokenService.getTtlSeconds()).thenReturn(TTL_SECONDS);

        // Act
        AccessTokenResponse result = service.login("Ada@Example.COM", PASSWORD);

        // Assert
        assertEquals(ACCESS_TOKEN, result.accessToken());
        assertEquals("Bearer", result.tokenType());
        assertEquals(TTL_SECONDS, result.expiresIn());
    }

    @Test
    void login_WhenPasswordIsWrong_ThrowsNotAuthorizedExceptionWithGenericMessage() {
        // Arrange
        when(repository.findByEmailIgnoreCase(EMAIL)).thenReturn(verifiedUser());
        when(hasher.matches(PASSWORD, HASH)).thenReturn(false);

        // Act
        NotAuthorizedException ex = assertThrows(NotAuthorizedException.class, () -> service.login(EMAIL, PASSWORD));

        // Assert
        assertEquals(AuthService.INVALID_CREDENTIALS_MESSAGE, ex.getMessage());
        verifyNoInteractions(tokenService);
    }

    @Test
    void login_WhenNoAccountUsesTheEmail_StillChecksThePasswordAndThrowsTheSameException() {
        // Arrange
        when(repository.findByEmailIgnoreCase(EMAIL)).thenReturn(null);

        // Act
        NotAuthorizedException ex = assertThrows(NotAuthorizedException.class, () -> service.login(EMAIL, PASSWORD));

        // Assert
        assertEquals(AuthService.INVALID_CREDENTIALS_MESSAGE, ex.getMessage());
        verify(hasher).matches(PASSWORD, null);
        verifyNoInteractions(tokenService);
    }

    @Test
    void login_WhenPasswordIsWrongAndEmailIsUnverified_ThrowsNotAuthorizedExceptionRatherThanRevealingTheAccount() {
        // Arrange
        User user = verifiedUser();
        user.emailVerifiedAt = null;
        when(repository.findByEmailIgnoreCase(EMAIL)).thenReturn(user);
        when(hasher.matches(PASSWORD, HASH)).thenReturn(false);

        // Act & Assert
        assertThrows(NotAuthorizedException.class, () -> service.login(EMAIL, PASSWORD));
    }

    @Test
    void login_WhenPasswordIsRightButEmailIsUnverified_ThrowsIllegalArgumentException() {
        // Arrange
        User user = verifiedUser();
        user.emailVerifiedAt = null;
        when(repository.findByEmailIgnoreCase(EMAIL)).thenReturn(user);
        when(hasher.matches(PASSWORD, HASH)).thenReturn(true);

        // Act & Assert
        IllegalArgumentException exception =
                assertThrows(IllegalArgumentException.class, () -> service.login(EMAIL, PASSWORD));
        assertEquals(AuthService.EMAIL_NOT_VERIFIED_MESSAGE, exception.getMessage());
        verifyNoInteractions(tokenService);
    }

    private static User verifiedUser() {
        User user = new User();
        user.email = EMAIL;
        user.passwordHash = HASH;
        user.emailVerifiedAt = Instant.now();
        return user;
    }
}
