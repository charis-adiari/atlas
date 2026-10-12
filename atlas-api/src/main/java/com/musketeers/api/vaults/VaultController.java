package com.musketeers.api.vaults;

import com.musketeers.api.middleware.ApiProblemDetail;
import com.musketeers.dto.migration.MigrationRequest;
import com.musketeers.dto.migration.MigrationResponse;
import com.musketeers.service.migration.MigrationService;
import io.quarkus.security.Authenticated;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponses;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

import java.util.UUID;

@Path("/vaults")
@Authenticated
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Vaults", description = "Operations on the signed-in user's vaults")
public class VaultController {
    private final MigrationService migrationService;
    private final JsonWebToken jwt;

    public VaultController(MigrationService migrationService, JsonWebToken jwt) {
        this.migrationService = migrationService;
        this.jwt = jwt;
    }

    @POST
    @Path("/migrate")
    @Operation(
            summary = "Migrate local data into the account",
            description = "Uploads the full local payload (vaults, folders, files and backlinks) in one transaction, so "
                    + "either all of it is saved or none of it is. Everything is owned by the signed-in user and keeps "
                    + "the ids and timestamps it had locally. Timestamps are ISO-8601 strings. The lists are flat and "
                    + "may be in any order, a folder can be listed before its parent."
    )
    @APIResponses({
            @APIResponse(
                    responseCode = "201", description = "Everything was stored, with the number of records of each kind",
                    content = @Content(schema = @Schema(implementation = MigrationResponse.class))
            ),
            @APIResponse(
                    responseCode = "400", description = "Invalid fields, or records that contradict each other",
                    content = @Content(schema = @Schema(implementation = ApiProblemDetail.class))
            ),
            @APIResponse(responseCode = "401", description = "Missing or invalid access token"),
            @APIResponse(
                    responseCode = "404", description = "The account no longer exists",
                    content = @Content(schema = @Schema(implementation = ApiProblemDetail.class))
            ),
            @APIResponse(
                    responseCode = "409", description = "Some of this data has already been migrated, nothing was stored",
                    content = @Content(schema = @Schema(implementation = ApiProblemDetail.class))
            )
    })
    public Response migrate(@NotNull(message = "Request body is required") @Valid MigrationRequest request) {
        UUID userId = UUID.fromString(jwt.getSubject());
        MigrationResponse body = migrationService.migrate(userId, request);

        return Response.status(Response.Status.CREATED).entity(body).build();
    }
}
