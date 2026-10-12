package com.musketeers.exception;

/**
 * Some of the uploaded ids are already in use, which normally means the data was migrated before, for example when a
 * retry follows an upload that actually succeeded. The whole migration is rolled back when it is thrown.
 */
public class MigrationConflictException extends RuntimeException {
    public static final String MESSAGE = "Some of this data has already been migrated.";

    public MigrationConflictException() {
        super(MESSAGE, null, false, false);
    }
}
