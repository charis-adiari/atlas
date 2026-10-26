package com.musketeers.dto;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;

public class SignupRequestTests {
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
