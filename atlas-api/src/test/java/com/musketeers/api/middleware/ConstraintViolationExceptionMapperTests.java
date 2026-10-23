package com.musketeers.api.middleware;

import com.musketeers.dto.SignupRequest;
import com.musketeers.dto.migration.MigrationRequest;
import com.musketeers.dto.migration.VaultDto;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.ws.rs.core.Response;
import org.hibernate.validator.HibernateValidator;
import org.hibernate.validator.messageinterpolation.ParameterMessageInterpolator;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

public class ConstraintViolationExceptionMapperTests {
    private final Validator validator = Validation.byProvider(HibernateValidator.class)
            .configure()
            .messageInterpolator(new ParameterMessageInterpolator())
            .buildValidatorFactory()
            .getValidator();

    private final ConstraintViolationExceptionMapper mapper = new ConstraintViolationExceptionMapper();

    @Test
    void toResponse_WhenAListItemIsInvalid_NamesTheFieldWithItsPosition() {
        // Arrange
        MigrationRequest request = new MigrationRequest(
                List.of(
                        new VaultDto(UUID.randomUUID(), "Fine", Instant.now()),
                        new VaultDto(UUID.randomUUID(), "  ", Instant.now())),
                List.of(), List.of(), List.of());
        Set<ConstraintViolation<MigrationRequest>> violations = validator.validate(request);

        // Act
        Response response = mapper.toResponse(new ConstraintViolationException(violations));

        // Assert
        assertEquals(400, response.getStatus());
        Map<String, String> errors = ((ApiProblemDetail) response.getEntity()).getErrors();
        assertEquals(Set.of("vaults[1].name"), errors.keySet());
        assertEquals("Vault name is required", errors.get("vaults[1].name"));
    }

    @Test
    void toResponse_WhenTopLevelFieldsAreInvalid_NamesThemByFieldOnly() {
        // Arrange
        Set<ConstraintViolation<SignupRequest>> violations = validator.validate(new SignupRequest("nope", "weak"));

        // Act
        Response response = mapper.toResponse(new ConstraintViolationException(violations));

        // Assert
        Map<String, String> errors = ((ApiProblemDetail) response.getEntity()).getErrors();
        assertEquals(Set.of("email", "password"), errors.keySet());
        assertTrue(errors.get("password").startsWith("Password must be"));
    }
}
