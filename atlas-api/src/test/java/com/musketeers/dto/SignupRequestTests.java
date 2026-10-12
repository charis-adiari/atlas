package com.musketeers.dto;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;

public class SignupRequestTests {
    @Test
    void constructor_TrimsAndLowerCasesEmail() {
        // Act
        SignupRequest request = new SignupRequest("  Ada@Example.COM ", "x");

        // Assert
        assertEquals("ada@example.com", request.email());
    }

    @Test
    void constructor_WhenEmailIsNull_KeepsItNullForValidationToReport() {
        // Act
        SignupRequest request = new SignupRequest(null, "x");

        // Assert
        assertNull(request.email());
    }

    @Test
    void constructor_DoesNotChangePassword() {
        // Act
        SignupRequest request = new SignupRequest("a@b.co", " Pa ss ");

        // Assert
        assertEquals(" Pa ss ", request.password());
    }

    @Test
    void toString_DoesNotContainPassword() {
        // Arrange
        SignupRequest request = new SignupRequest("ada@example.com", "S3cret!pass");

        // Act
        String text = request.toString();

        // Assert
        assertFalse(text.contains("S3cret!pass"), text);
    }
}
