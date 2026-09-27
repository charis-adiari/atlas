package com.musketeers.api.roles;

import com.musketeers.api.middleware.ApiProblemDetail;
import com.musketeers.dto.RoleDto;
import com.musketeers.service.RoleService;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponses;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

@Path("/roles")
@Produces(MediaType.APPLICATION_JSON)
@Tag(name = "Roles", description = "Operations for retrieving role information")
public class RoleController {
    private final RoleService roleService;

    public RoleController(RoleService roleService) {
        this.roleService = roleService;
    }

    @GET
    @Path("/{id}")
    @Operation(summary = "Get a role by id")
    @APIResponses({
            @APIResponse(
                    responseCode = "200", content = @Content(schema = @Schema(implementation = RoleDto.class))
            ),
            @APIResponse(
                    responseCode = "404", content = @Content(schema = @Schema(implementation = ApiProblemDetail.class))
            )
    })
    public RoleDto getById(@PathParam("id") Long id) {
        return roleService.getById(id);
    }
}
