package com.musketeers.api.middleware;

import jakarta.ws.rs.core.Response;

/**
 * Minimal Problem Details (RFC 9457) shape: just status, title and detail. Used instead of HttpProblem directly, since
 * HttpProblem auto-populates additional fields (e.g. "instance") that we don't want surfaced here.
 */
public final class ApiProblemDetail {
    private ApiProblemDetail() {}

    public ApiProblemDetail(int statusCode, String title, String detail) {
        this.statusCode = statusCode;
        this.title = title;
        this.detail = detail;
    }

    private int statusCode;
    private String title;
    private String detail;

    public int getStatusCode() {
        return statusCode;
    }

    public String getTitle() {
        return title;
    }

    public String getDetail() {
        return detail;
    }

    /**
     * Creates a problem details with response status set to 404 - not found
     * @param detail A human-readable description of the problem
     */
    public static ApiProblemDetail notFound(String detail) {
        return build(Response.Status.NOT_FOUND, "Not Found", detail);
    }

    /**
     * Creates a problem details with response status set to 400 - bad request
     * @param detail A human-readable description of the problem
     */
    public static ApiProblemDetail badRequest(String detail) {
        return build(Response.Status.BAD_REQUEST, "Bad Request", detail);
    }

    /**
     * Creates a problem details with response status set to 403 - forbidden
     * @param detail A human-readable description of the problem
     */
    public static ApiProblemDetail forbidden(String detail) {
        return build(Response.Status.FORBIDDEN, "Forbidden", detail);
    }

    /**
     * Creates a problem details with response status set to 500 - internal server error
     * @param detail A human-readable description of the problem
     */
    public static ApiProblemDetail internalServerError(String detail) {
        return build(Response.Status.INTERNAL_SERVER_ERROR, "Internal Server Error", detail);
    }

    /**
     * Builds a problem detail
     * @param status HTTP status code
     * @param title A short, human-readable summary of the problem type
     * @param detail A human-readable explanation specific to this occurrence of the problem
     */
    private static ApiProblemDetail build(Response.Status status, String title, String detail) {
        return new ApiProblemDetail(status.getStatusCode(), title, detail);
    }
}
