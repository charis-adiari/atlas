package com.musketeers.service;

/**
 * Thrown when a user with the right password tries to sign in before verifying their email address. It becomes a 403
 * whose problem detail carries {@link #CODE}, so the client can offer to resend the verification link.
 */
public class EmailNotVerifiedException extends RuntimeException {
    public static final String CODE = "EMAIL_NOT_VERIFIED";
    public static final String MESSAGE = "Verify your email address before signing in.";

    public EmailNotVerifiedException() {
        super(MESSAGE);
    }
}
