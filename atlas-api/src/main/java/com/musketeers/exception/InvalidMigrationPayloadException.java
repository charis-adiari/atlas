package com.musketeers.exception;

/**
 * The migration payload is well-formed but inconsistent, for example a file that points at a folder that was not
 * uploaded. The message names the offending record and is safe to show to the client.
 */
public class InvalidMigrationPayloadException extends RuntimeException {
    public InvalidMigrationPayloadException(String message) {
        super(message);
    }
}
