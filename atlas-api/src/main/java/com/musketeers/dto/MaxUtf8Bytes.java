package com.musketeers.dto;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * The text must be at most {@link #value} bytes long once encoded as UTF-8. A character count is not enough for
 * bcrypt, which reads bytes: a multi-byte character takes 2 to 4 of them. A null value is valid.
 */
@Documented
@Constraint(validatedBy = MaxUtf8BytesValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT})
@Retention(RetentionPolicy.RUNTIME)
public @interface MaxUtf8Bytes {
    int value();

    String message() default "Text is too long";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
