package com.musketeers.validation;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

public class PasswordPolicyTests {
    @ParameterizedTest
    @ValueSource(strings = {
            "Str0ng!Pass",
            "Aa1!aaaa",
            "Correct Horse 9 Battery",
            "Pässw0rd!"
    })
    void isAcceptable_WhenEveryRuleIsMet_ReturnsTrue(String password) {
        // Act
        boolean result = PasswordPolicy.isAcceptable(password);

        // Assert
        assertTrue(result, password);
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "Sh0rt!a",
            "alllowercase1!",
            "ALLUPPERCASE1!",
            "NoDigitsHere!!",
            "NoSpecial123abc",
            "        ",
            ""
    })
    void isAcceptable_WhenARuleIsBroken_ReturnsFalse(String password) {
        // Act
        boolean result = PasswordPolicy.isAcceptable(password);

        // Assert
        assertFalse(result, password);
    }

    @Test
    void isAcceptable_WhenPasswordIsNull_ReturnsFalse() {
        // Act
        boolean result = PasswordPolicy.isAcceptable(null);

        // Assert
        assertFalse(result);
    }

    @Test
    void isAcceptable_WhenPasswordIsExactlyTheMaximumNumberOfBytes_ReturnsTrue() {
        // Arrange
        String ascii = "Aa1!" + "x".repeat(68);
        String multiByte = "Aa1!" + "é".repeat(34);

        // Act
        boolean asciiResult = PasswordPolicy.isAcceptable(ascii);
        boolean multiByteResult = PasswordPolicy.isAcceptable(multiByte);

        // Assert
        assertTrue(asciiResult);
        assertTrue(multiByteResult);
    }

    @Test
    void isAcceptable_WhenPasswordIsOverTheMaximumNumberOfBytes_ReturnsFalse() {
        // Arrange
        String tooManyCharacters = "Aa1!" + "x".repeat(69);
        String tooManyBytesButFewCharacters = "Aa1!" + "é".repeat(35);

        // Act
        boolean charactersResult = PasswordPolicy.isAcceptable(tooManyCharacters);
        boolean bytesResult = PasswordPolicy.isAcceptable(tooManyBytesButFewCharacters);

        // Assert
        assertFalse(charactersResult);
        assertFalse(bytesResult);
    }
}
