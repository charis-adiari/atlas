package com.musketeers.api.middleware;

import jakarta.persistence.EntityNotFoundException;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;

/**
 * Single global exception mapper for the whole app. Catches all unhandled runtime exceptions and maps them to problem
 * detail responses. Add a case below for each new exception type that needs its own status code; anything else
 * becomes a generic 500.
 */
@Provider
public class GlobalExceptionHandler implements ExceptionMapper<Exception> {
    @Override
    public Response toResponse(Exception exception) {
        ApiProblemDetail problem = switch (exception) {
            case EntityNotFoundException e -> ApiProblemDetail.notFound(e.getMessage());
             case IllegalArgumentException e -> ApiProblemDetail.badRequest(e.getMessage());
            default -> ApiProblemDetail.internalServerError("An unexpected error occurred.");
        };

        return Response.status(problem.getStatusCode())
                .type("application/problem+json")
                .entity(problem)
                .build();
    }
}
