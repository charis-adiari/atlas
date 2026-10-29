package com.musketeers.api.auth;

import com.musketeers.api.middleware.ApiProblemDetail;
import com.musketeers.dto.AccessTokenResponse;
import com.musketeers.dto.LoginRequest;
import com.musketeers.dto.ResendVerificationRequest;
import com.musketeers.dto.SignupRequest;
import com.musketeers.dto.SignupResponse;
import com.musketeers.dto.VerifyEmailRequest;
import com.musketeers.service.AuthService;
import com.musketeers.service.EmailVerificationService;
import io.vertx.core.http.HttpServerRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.HttpHeaders;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponses;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;
import org.jboss.resteasy.reactive.ResponseHeader;
import org.jboss.resteasy.reactive.ResponseStatus;

@Path("/auth")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Auth", description = "Operations for creating accounts, signing in and verifying email addresses")
public class AuthController {
    private final AuthService authService;
    private final EmailVerificationService emailVerificationService;

    public AuthController(AuthService authService, EmailVerificationService emailVerificationService) {
        this.authService = authService;
        this.emailVerificationService = emailVerificationService;
    }

    @POST
    @Path("/signup")
    @Operation(
            summary = "Create an account",
            description = "Creates an account and emails a verification link. The user is not signed in: the access "
                    + "token is issued when the link is opened. The password needs 8-72 characters with an uppercase "
                    + "letter, a lowercase letter, a digit and a special character."
    )
    @APIResponses({
            @APIResponse(
                    responseCode = "201", description = "Account created and verification link sent",
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
    @ResponseHeader(name = HttpHeaders.CACHE_CONTROL, value = "no-store")
    @Operation(
            summary = "Verify an email address",
            description = "Verifies the email address that the token in the emailed link was sent to and signs its "
                    + "owner in by returning an access token. A token works once. It is a POST rather than a GET so "
                    + "that email scanners and link previews, which fetch links ahead of the user, cannot use it up."
    )
    @APIResponses({
            @APIResponse(
                    responseCode = "200", description = "Email address verified and user signed in",
                    content = @Content(schema = @Schema(implementation = AccessTokenResponse.class))
            ),
            @APIResponse(
                    responseCode = "400", description = "The token is missing, unknown, already used or expired",
                    content = @Content(schema = @Schema(implementation = ApiProblemDetail.class))
            )
    })
    public AccessTokenResponse verifyEmail(
            @NotNull(message = "Request body is required") @Valid VerifyEmailRequest request
    ) {
        return authService.verifyEmail(request.token());
    }

    @POST
    @Path("/login")
    @ResponseHeader(name = HttpHeaders.CACHE_CONTROL, value = "no-store")
    @Operation(
            summary = "Sign in",
            description = "Signs a user in by returning an access token. Details about the user are read from the "
                    + "claims inside the token. The email address must be verified first."
    )
    @APIResponses({
            @APIResponse(
                    responseCode = "200", description = "Signed in",
                    content = @Content(schema = @Schema(implementation = AccessTokenResponse.class))
            ),
            @APIResponse(
                    responseCode = "400", description = "Email or password missing, listed per field under errors",
                    content = @Content(schema = @Schema(implementation = ApiProblemDetail.class))
            ),
            @APIResponse(
                    responseCode = "401", description = "No account uses the email or the password is wrong",
                    content = @Content(schema = @Schema(implementation = ApiProblemDetail.class))
            ),
            @APIResponse(
                    responseCode = "403",
                    description = "The password is right but the email address is not verified yet; code is "
                            + "EMAIL_NOT_VERIFIED",
                    content = @Content(schema = @Schema(implementation = ApiProblemDetail.class))
            )
    })
    public AccessTokenResponse login(@NotNull(message = "Request body is required") @Valid LoginRequest request) {
        return authService.login(request.email(), request.password());
    }

    @POST
    @Path("/resend-verification")
    @ResponseStatus(202)
    @Operation(
            summary = "Send the verification email again",
            description = "Emails a new verification link to the address if it belongs to an account that is not "
                    + "verified yet. The earlier link stops working. The response is the same whether or not an email "
                    + "was sent, so it does not reveal which addresses are registered."
    )
    @APIResponses({
            @APIResponse(responseCode = "202", description = "Request accepted"),
            @APIResponse(
                    responseCode = "400", description = "Invalid email, listed under errors",
                    content = @Content(schema = @Schema(implementation = ApiProblemDetail.class))
            ),
            @APIResponse(
                    responseCode = "429", description = "Too many requests from this client",
                    content = @Content(schema = @Schema(implementation = ApiProblemDetail.class))
            )
    })
    public void resendVerification(
            @NotNull(message = "Request body is required") @Valid ResendVerificationRequest request,
            @Context HttpServerRequest httpRequest
    ) {
        emailVerificationService.resend(request.email(), httpRequest.remoteAddress().hostAddress());
    }
}
