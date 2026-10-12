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
        return hasUniqueViolation(error, EMAIL_CONSTRAINT);
    }

    /**
     * Checks whether the error, or anything in its cause chain, is a unique violation on any constraint, which includes
     * a primary key. Batched inserts report the violation through a wrapper, so the whole chain is searched.
     *
     * @param error the failure to inspect, may be null
     * @return true if the failure was caused by a value that already exists
     */
    public static boolean isUniqueViolation(Throwable error) {
        return hasUniqueViolation(error, null);
    }

    /**
     * Searches the cause chain for a unique violation, optionally on one named constraint.
     *
     * @param error the failure to inspect, may be null
     * @param constraint name the driver message must mention, or null to accept any constraint
     * @return true if a matching violation is in the chain
     */
    private static boolean hasUniqueViolation(Throwable error, String constraint) {
        Throwable current = error;
        for (int depth = 0; current != null && depth < MAX_DEPTH; depth++, current = current.getCause()) {
            if (current instanceof SQLException sql
                    && UNIQUE_VIOLATION.equals(sql.getSQLState())
                    && (constraint == null || (sql.getMessage() != null && sql.getMessage().contains(constraint)))) {
                return true;
            }
        }
        return false;
    }
}
