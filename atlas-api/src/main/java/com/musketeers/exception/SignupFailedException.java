package com.musketeers.exception;

/**
 * Signup could not create the account. The message deliberately says nothing about why: telling the caller that an
 * email is already registered would let anyone check which addresses have accounts. It is a RuntimeException so the
 * surrounding transaction rolls back, and it carries no cause or stack trace because there is nothing to leak.
 */
public class SignupFailedException extends RuntimeException {
    public static final String MESSAGE = "We couldn't create your account with these details.";

    public SignupFailedException() {
        super(MESSAGE, null, false, false);
    }
}
