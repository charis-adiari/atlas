package com.musketeers.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

/**
 * Validates {@link StrongPassword} by delegating to {@link PasswordPolicy}. A null value is valid here because
 * {@code @NotNull} reports it, which keeps the field from getting two messages.
 */
public class StrongPasswordValidator implements ConstraintValidator<StrongPassword, String> {
    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        return value == null || PasswordPolicy.isAcceptable(value);
    }
}
