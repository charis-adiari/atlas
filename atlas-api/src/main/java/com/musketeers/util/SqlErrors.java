package com.musketeers.util;

import java.sql.SQLException;

/**
 * Helpers for recognising specific database errors.
 */
public final class SqlErrors {
    private static final String UNIQUE_VIOLATION = "23505";
    private static final String EMAIL_CONSTRAINT = "uq_users_email";
    private static final int MAX_DEPTH = 16;

    private SqlErrors() {
    }

    /**
     * Checks whether the error, or anything in its cause chain, is a unique violation on the users email constraint
     * (V2.0.0__create_users_table.sql). Hibernate wraps the driver exception, so the whole chain is searched instead
     * of expecting a particular wrapper type. The PostgreSQL SQLSTATE 23505 is unique_violation.
     *
     * @param error the failure to inspect, may be null
     * @return true if the failure was caused by a duplicate email
     */
    public static boolean isDuplicateEmail(Throwable error) {
        Throwable current = error;
        for (int depth = 0; current != null && depth < MAX_DEPTH; depth++, current = current.getCause()) {
            if (current instanceof SQLException sql
                    && UNIQUE_VIOLATION.equals(sql.getSQLState())
                    && sql.getMessage() != null
                    && sql.getMessage().contains(EMAIL_CONSTRAINT)) {
                return true;
            }
        }
        return false;
    }
}
