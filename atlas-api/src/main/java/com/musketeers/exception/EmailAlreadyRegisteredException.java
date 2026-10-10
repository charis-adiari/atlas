package com.musketeers.exception;

/**
 * Signup was refused because the email already belongs to an account. It is a RuntimeException so the surrounding
 * transaction rolls back, and it carries no cause or stack trace because the message says everything there is to say.
 */
public class EmailAlreadyRegisteredException extends RuntimeException {
    public static final String MESSAGE = "An account with this email already exists.";

    public EmailAlreadyRegisteredException() {
        super(MESSAGE, null, false, false);
    }
}
