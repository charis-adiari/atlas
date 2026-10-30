package com.musketeers.api.auth;

import com.musketeers.api.middleware.ApiProblemDetail;
import com.musketeers.dto.SignupRequest;
import com.musketeers.dto.SignupResponse;
import com.musketeers.dto.VerificationStatusResponse;
import com.musketeers.dto.VerifyEmailRequest;
import com.musketeers.service.EmailVerificationService;
import com.musketeers.service.auth.AuthService;
import io.quarkus.security.Authenticated;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.HttpHeaders;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponses;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;
import org.jboss.resteasy.reactive.ResponseHeader;

import java.util.UUID;

@Path("/auth")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Auth", description = "Operations for creating accounts, signing in and verifying email addresses")
public class AuthController {
    private final AuthService authService;
    private final EmailVerificationService emailVerificationService;
    private final JsonWebToken jwt;

    public AuthController(
            AuthService authService,
            EmailVerificationService emailVerificationService,
            JsonWebToken jwt
    ) {
        this.authService = authService;
        this.emailVerificationService = emailVerificationService;
        this.jwt = jwt;
    }

    @POST
    @Path("/signup")
    @Operation(
            summary = "Create an account",
            description = "Creates an account, emails a verification link and signs the new user in by returning an "
                    + "access token. Details about the user are read from the claims inside the token. The password "
                    + "needs 8-72 characters with an uppercase letter, a lowercase letter, a digit and a special "
                    + "character."
    )
    @APIResponses({
            @APIResponse(
                    responseCode = "201", description = "Account created",
                    content = @Content(schema = @Schema(implementation = SignupResponse.class))
            ),
            @APIResponse(
                    responseCode = "400",
                    description = "Invalid email or password, listed per field under errors, or the account could "
                            + "not be created with these details",
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

    @POST
    @Path("/verify-email")
    @Operation(
            summary = "Verify an email address",
            description = "Verifies the email address that the token in the emailed link was sent to. A token works "
                    + "once. It does not need a signed-in user, because the link may be opened on another device."
    )
    @APIResponses({
            @APIResponse(responseCode = "204", description = "Email address verified"),
            @APIResponse(
                    responseCode = "400", description = "The token is missing, unknown, already used or expired",
                    content = @Content(schema = @Schema(implementation = ApiProblemDetail.class))
            )
    })
    public void verifyEmail(@NotNull(message = "Request body is required") @Valid VerifyEmailRequest request) {
        emailVerificationService.verify(request.token());
    }

    @POST
    @Path("/resend-verification")
    @Authenticated
    @Consumes(MediaType.WILDCARD)
    @Operation(
            summary = "Send the verification email again",
            description = "Emails the signed-in user a new verification link. The earlier link stops working."
    )
    @APIResponses({
            @APIResponse(responseCode = "204", description = "Email sent"),
            @APIResponse(
                    responseCode = "400", description = "The email address is already verified",
                    content = @Content(schema = @Schema(implementation = ApiProblemDetail.class))
            ),
            @APIResponse(responseCode = "401", description = "Missing or invalid access token"),
            @APIResponse(
                    responseCode = "404", description = "The account no longer exists",
                    content = @Content(schema = @Schema(implementation = ApiProblemDetail.class))
            )
    })
    public void resendVerification() {
        emailVerificationService.resend(UUID.fromString(jwt.getSubject()));
    }

    @GET
    @Path("/verification-status")
    @Authenticated
    @ResponseHeader(name = HttpHeaders.CACHE_CONTROL, value = "no-store")
    @Operation(
            summary = "Check whether the email address is verified",
            description = "Tells whether the signed-in user has opened the emailed verification link."
    )
    @APIResponses({
            @APIResponse(
                    responseCode = "200", description = "Verification status",
                    content = @Content(schema = @Schema(implementation = VerificationStatusResponse.class))
            ),
            @APIResponse(responseCode = "401", description = "Missing or invalid access token"),
            @APIResponse(
                    responseCode = "404", description = "The account no longer exists",
                    content = @Content(schema = @Schema(implementation = ApiProblemDetail.class))
            )
    })
    public VerificationStatusResponse getVerificationStatus() {
        boolean isVerified = emailVerificationService.isVerified(UUID.fromString(jwt.getSubject()));

        return new VerificationStatusResponse(isVerified);
    }
}
