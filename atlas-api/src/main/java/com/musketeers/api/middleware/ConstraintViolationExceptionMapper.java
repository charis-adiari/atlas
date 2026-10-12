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
 * end can show each message next to its input. A field inside a list is named with its position, such as
 * "vaults[0].name". It has to be its own mapper because Quarkus ships a built-in mapper for validation exceptions that
 * would win over the catch-all in {@link GlobalExceptionHandler}, and without this one it reports field names like
 * "signup.request.password".
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
     * Gets the name of the field a violation points at, relative to the request body. The method and parameter at the
     * start of the path are dropped, and a position inside a list is written in brackets after the list. A violation
     * on the parameter itself, such as a missing body, has no field to point at and is reported under "body".
     */
    private static String getFieldName(ConstraintViolation<?> violation) {
        StringBuilder name = new StringBuilder();
        for (Path.Node node : violation.getPropertyPath()) {
            if (node.getKind() == ElementKind.PARAMETER) {
                name.setLength(0);
            } else if (node.getKind() == ElementKind.PROPERTY) {
                appendProperty(name, node);
            }
        }
        return name.length() == 0 ? BODY_FIELD : name.toString();
    }

    /**
     * Adds a property to the field name, preceded by the position of the list element it sits in, if any.
     */
    private static void appendProperty(StringBuilder name, Path.Node node) {
        if (name.length() > 0) {
            if (node.isInIterable() && node.getIndex() != null) {
                name.append('[').append(node.getIndex()).append(']');
            }
            name.append('.');
        }
        name.append(node.getName());
    }
}
