package com.musketeers.api;

import com.musketeers.api.roles.RoleController;
import com.musketeers.domain.Role;
import com.musketeers.repository.RoleRepository;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.common.http.TestHTTPEndpoint;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.is;

@QuarkusTest
@TestHTTPEndpoint(RoleController.class)
public class RoleControllerIntegrationTests {
    @Inject
    RoleRepository roleRepository;

    @AfterEach
    void cleanUp() {
        QuarkusTransaction.requiringNew().run(() -> roleRepository.deleteAll());
    }

    @Test
    void getById_ReturnsRole() {
        Role role = saveRole("ADMIN", "Full administrative access");

        given()
            .when().get(role.id.toString())
            .then()
            .statusCode(200)
            .body("id", is(role.id.intValue()))
            .body("name", equalTo(role.name))
            .body("description", equalTo(role.description));
    }

    @Test
    void getById_whenNotFound_Returns404() {
        given()
            .when().get("999999")
            .then()
            .statusCode(404)
            .body("statusCode", is(404))
            .body("title", equalTo("Not Found"))
            .body("detail", equalTo("Role with id 999999 not found"));
    }

    private Role saveRole(String roleName, String roleDescription) {
        Role role = new Role();
        role.name = roleName;
        role.description = roleDescription;
        role.createdAt = LocalDateTime.now();
        QuarkusTransaction.requiringNew().run(() -> roleRepository.persist(role));
        return role;
    }
}
