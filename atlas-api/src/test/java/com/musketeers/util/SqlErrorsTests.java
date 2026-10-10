package com.musketeers.util;

import org.junit.jupiter.api.Test;

import java.sql.SQLException;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

public class SqlErrorsTests {
    private static final String UNIQUE_VIOLATION = "23505";
    private static final String DUPLICATE_EMAIL_MESSAGE = "ERROR: duplicate key value violates unique constraint "
            + "\"uq_users_email\"\n  Detail: Key (email)=(ada@example.com) already exists.";

    @Test
    void isDuplicateEmail_WhenViolationIsWrappedInOtherExceptions_ReturnsTrue() {
        // Arrange
        SQLException driver = new SQLException(DUPLICATE_EMAIL_MESSAGE, UNIQUE_VIOLATION);
        Throwable wrapped = new RuntimeException("outer", new IllegalStateException("middle", driver));

        // Act
        boolean result = SqlErrors.isDuplicateEmail(wrapped);

        // Assert
        assertTrue(result);
    }

    @Test
    void isDuplicateEmail_WhenUniqueViolationIsOnAnotherConstraint_ReturnsFalse() {
        // Arrange
        SQLException other = new SQLException(
                "ERROR: duplicate key value violates unique constraint \"users_pkey\"", UNIQUE_VIOLATION);

        // Act
        boolean result = SqlErrors.isDuplicateEmail(new RuntimeException(other));

        // Assert
        assertFalse(result);
    }

    @Test
    void isDuplicateEmail_WhenSqlErrorIsNotAUniqueViolation_ReturnsFalse() {
        // Arrange
        SQLException notNull = new SQLException("ERROR: null value in column \"uq_users_email\"", "23502");

        // Act
        boolean result = SqlErrors.isDuplicateEmail(new RuntimeException(notNull));

        // Assert
        assertFalse(result);
    }

    @Test
    void isDuplicateEmail_WhenErrorIsNotASqlError_ReturnsFalse() {
        // Act
        boolean plainResult = SqlErrors.isDuplicateEmail(new RuntimeException("boom"));
        boolean nullResult = SqlErrors.isDuplicateEmail(null);

        // Assert
        assertFalse(plainResult);
        assertFalse(nullResult);
    }
}
