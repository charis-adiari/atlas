package com.musketeers.api.auth;

import com.musketeers.api.middleware.ApiProblemDetail;
import com.musketeers.dto.SignupRequest;
import com.musketeers.dto.SignupResponse;
import com.musketeers.service.AuthService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.HttpHeaders;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponses;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

@Path("/auth")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Auth", description = "Operations for creating accounts and signing in")
public class AuthController {
    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @POST
    @Path("/signup")
    @Operation(
            summary = "Create an account",
            description = "Creates an account and returns the new user with an access token. The password must have "
                    + "8-72 bytes with an uppercase letter, a lowercase letter, a digit and a special character. "
                    + "A failed signup never says why, so the response cannot be used to find registered emails."
    )
    @APIResponses({
            @APIResponse(
                    responseCode = "201", description = "Account created",
                    content = @Content(schema = @Schema(implementation = SignupResponse.class))
            ),
            @APIResponse(
                    responseCode = "400", description = "Invalid email or password, listed per field under errors",
                    content = @Content(schema = @Schema(implementation = ApiProblemDetail.class))
            ),
            @APIResponse(
                    responseCode = "409", description = "The account could not be created with these details",
                    content = @Content(schema = @Schema(implementation = ApiProblemDetail.class))
            )
    })
    public Response signup(@NotNull(message = "Request body is required") @Valid SignupRequest request) {
        SignupResponse body = authService.signup(request.email(), request.password());

        return Response.status(Response.Status.CREATED)
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .entity(body)
                .build();
    }
}
