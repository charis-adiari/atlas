package com.musketeers.dto;

import org.junit.jupiter.api.Test;

import jakarta.validation.Validation;
import jakarta.validation.Validator;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

public class SignupRequestTests {
    private static final Validator VALIDATOR = Validation.buildDefaultValidatorFactory().getValidator();

    private static boolean hasPasswordError(String password) {
        return VALIDATOR.validate(new SignupRequest("ada@example.com", password)).stream()
                .anyMatch(v -> v.getPropertyPath().toString().equals("password"));
    }

    @Test
    void password_WhenExactly72Bytes_IsAccepted() {
        // Arrange
        String password = "Aa1!" + "x".repeat(68);

        // Act & Assert
        assertFalse(hasPasswordError(password));
    }

    @Test
    void password_WhenUnder72CharactersButOver72Bytes_IsRejected() {
        // Arrange: 4 + 40 characters, but each "é" takes 2 bytes, so 84 bytes
        String password = "Aa1!" + "é".repeat(40);

        // Act & Assert
        assertTrue(password.length() <= 72);
        assertTrue(hasPasswordError(password));
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
