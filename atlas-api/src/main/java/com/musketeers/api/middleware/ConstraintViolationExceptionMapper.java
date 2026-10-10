package com.musketeers.api.middleware;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import jakarta.validation.ElementKind;
import jakarta.validation.Path;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;

import java.util.Map;
import java.util.TreeMap;

/**
 * Maps Bean Validation failures to a 400 problem detail that lists one message per field under "errors", so the front
 * end can show each message next to its input. It has to be its own mapper because Quarkus ships a built-in mapper for
 * validation exceptions that would win over the catch-all in {@link GlobalExceptionHandler}, and without this one it
 * reports field names like "signup.request.password".
 */
@Provider
public class ConstraintViolationExceptionMapper implements ExceptionMapper<ConstraintViolationException> {
    private static final String DETAIL = "The request is invalid.";
    private static final String BODY_FIELD = "body";

    @Override
    public Response toResponse(ConstraintViolationException exception) {
        Map<String, String> errors = new TreeMap<>();
        for (ConstraintViolation<?> violation : exception.getConstraintViolations()) {
            errors.putIfAbsent(getFieldName(violation), violation.getMessage());
        }

        ApiProblemDetail problem = ApiProblemDetail.badRequest(DETAIL, errors);

        return Response.status(problem.getStatusCode())
                .type("application/problem+json")
                .entity(problem)
                .build();
    }

    /**
     * Gets the name of the field a violation points at. A violation on the parameter itself, such as a missing body,
     * has no field to point at and is reported under "body".
     */
    private static String getFieldName(ConstraintViolation<?> violation) {
        Path.Node last = null;
        for (Path.Node node : violation.getPropertyPath()) {
            last = node;
        }
        if (last == null || last.getKind() == ElementKind.PARAMETER) {
            return BODY_FIELD;
        }
        return last.getName();
    }
}
