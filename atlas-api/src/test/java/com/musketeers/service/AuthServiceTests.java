package com.musketeers.service;

import com.musketeers.api.auth.mappers.UserMapper;
import com.musketeers.domain.User;
import com.musketeers.dto.SignupResponse;
import com.musketeers.dto.UserDto;
import com.musketeers.exception.SignupFailedException;
import com.musketeers.repository.UserRepository;
import jakarta.persistence.PersistenceException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.sql.SQLException;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class AuthServiceTests {
    private static final String EMAIL = "ada@example.com";
    private static final String PASSWORD = "Str0ng!Pass";
    private static final String HASH = "$2a$12$hashed";
    private static final String TOKEN = "signed-jwt";
    private static final long TTL_SECONDS = 3600L;
    private static final String DUPLICATE_EMAIL_MESSAGE = "ERROR: duplicate key value violates unique constraint "
            + "\"uq_users_email\"";

    @Mock
    UserRepository repository;

    @Mock
    PasswordHasher hasher;

    @Mock
    TokenService tokenService;

    @Mock
    UserMapper mapper;

    @InjectMocks
    AuthService service;

    @Test
    void signup_ReturnsUserAndAccessToken() {
        // Arrange
        UserDto userDto = new UserDto(UUID.randomUUID(), EMAIL);
        when(hasher.hash(PASSWORD)).thenReturn(HASH);
        when(mapper.toDto(any(User.class))).thenReturn(userDto);
        when(tokenService.issue(any(User.class))).thenReturn(TOKEN);
        when(tokenService.getTtlSeconds()).thenReturn(TTL_SECONDS);

        // Act
        SignupResponse result = service.signup(EMAIL, PASSWORD);

        // Assert
        assertEquals(userDto, result.user());
        assertEquals(TOKEN, result.accessToken());
        assertEquals("Bearer", result.tokenType());
        assertEquals(TTL_SECONDS, result.expiresIn());
    }

    @Test
    void signup_StoresTheHashAndNeverThePassword() {
        // Arrange
        when(hasher.hash(PASSWORD)).thenReturn(HASH);
        ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);

        // Act
        service.signup(EMAIL, PASSWORD);

        // Assert
        verify(repository).persistAndFlush(saved.capture());
        assertEquals(EMAIL, saved.getValue().email);
        assertEquals(HASH, saved.getValue().passwordHash);
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
        order.verify(repository).persistAndFlush(any(User.class));
    }

    @Test
    void signup_WhenEmailIsAlreadyRegistered_ThrowsSignupFailedException() {
        // Arrange
        when(hasher.hash(PASSWORD)).thenReturn(HASH);
        SQLException duplicate = new SQLException(DUPLICATE_EMAIL_MESSAGE, "23505");
        doThrow(new PersistenceException(duplicate)).when(repository).persistAndFlush(any(User.class));

        // Act
        SignupFailedException ex = assertThrows(SignupFailedException.class, () -> service.signup(EMAIL, PASSWORD));

        // Assert
        assertEquals(SignupFailedException.MESSAGE, ex.getMessage());
        verifyNoInteractions(tokenService);
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
        verifyNoInteractions(tokenService);
    }
}
