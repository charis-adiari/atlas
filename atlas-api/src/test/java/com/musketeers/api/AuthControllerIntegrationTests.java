package com.musketeers.api;

import com.musketeers.api.auth.AuthController;
import com.musketeers.domain.User;
import com.musketeers.exception.SignupFailedException;
import com.musketeers.repository.UserRepository;
import io.quarkus.elytron.security.common.BcryptUtil;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.common.http.TestHTTPEndpoint;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import io.restassured.path.json.JsonPath;
import io.restassured.response.Response;
import jakarta.inject.Inject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.emptyOrNullString;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasKey;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

@QuarkusTest
@TestHTTPEndpoint(AuthController.class)
public class AuthControllerIntegrationTests {
    private static final String EMAIL = "ada@example.com";
    private static final String STRONG_PASSWORD = "Str0ng!Pass";
    private static final String PROBLEM_JSON = "application/problem+json";

    @Inject
    UserRepository userRepository;

    @BeforeEach
    void startFromAnEmptyUsersTable() {
        QuarkusTransaction.requiringNew().run(() -> userRepository.deleteAll());
    }

    @Test
    void signup_CreatesAccountAndReturnsToken() {
        Response response = signup(EMAIL, STRONG_PASSWORD);

        response.then()
                .statusCode(201)
                .header("Cache-Control", "no-store")
                .body("user.email", equalTo(EMAIL))
                .body("tokenType", equalTo("Bearer"))
                .body("expiresIn", equalTo(3600))
                .body("accessToken", not(emptyOrNullString()));
        assertFalse(response.asString().contains(STRONG_PASSWORD));

        JsonPath claims = claimsOf(response.jsonPath().getString("accessToken"));
        assertEquals(response.jsonPath().getString("user.id"), claims.getString("sub"));
        assertEquals("atlas", claims.getString("iss"));
        assertEquals(EMAIL, claims.getString("email"));
        assertTrue(claims.getList("groups", String.class).contains("user"));
        assertTrue(claims.getLong("exp") > claims.getLong("iat"));
    }

    @Test
    void signup_StoresBcryptHashInsteadOfPassword() {
        signup(EMAIL, STRONG_PASSWORD).then().statusCode(201);

        User stored = findByEmail(EMAIL);
        assertNotNull(stored);
        assertNotEquals(STRONG_PASSWORD, stored.passwordHash);
        assertTrue(stored.passwordHash.startsWith("$2"));
        assertTrue(BcryptUtil.matches(STRONG_PASSWORD, stored.passwordHash));
        assertNull(stored.emailVerifiedAt);
    }

    @Test
    void signup_WhenEmailHasCapitalsAndSpaces_StoresItTrimmedAndLowerCased() {
        signup("  Ada@Example.COM ", STRONG_PASSWORD)
                .then().statusCode(201)
                .body("user.email", equalTo(EMAIL));

        assertNotNull(findByEmail(EMAIL));
    }

    @Test
    void signup_WhenPasswordIsExactlyTheMaximumLength_Returns201() {
        signup(EMAIL, "Aa1!" + "x".repeat(68)).then().statusCode(201);
    }

    @Test
    void signup_WhenEmailIsAlreadyRegistered_Returns409WithoutSayingWhy() {
        signup(EMAIL, STRONG_PASSWORD).then().statusCode(201);

        Response second = signup("ADA@example.com", STRONG_PASSWORD);

        second.then()
                .statusCode(409)
                .contentType(PROBLEM_JSON)
                .body("statusCode", is(409))
                .body("title", equalTo("Conflict"))
                .body("detail", equalTo(SignupFailedException.MESSAGE));
        String body = second.asString().toLowerCase();
        for (String giveaway : List.of("exist", "already", "registered", "taken", "duplicate")) {
            assertFalse(body.contains(giveaway), "response reveals the account exists: " + body);
        }
        assertEquals(1L, userCount());
    }

    @Test
    void signup_WhenSimultaneousRequestsUseTheSameEmail_CreatesExactlyOneAccount() throws Exception {
        int attempts = 8;
        ExecutorService pool = Executors.newFixedThreadPool(attempts);
        CountDownLatch start = new CountDownLatch(1);
        try {
            List<Future<Integer>> results = new ArrayList<>();
            for (int i = 0; i < attempts; i++) {
                results.add(pool.submit(() -> {
                    start.await();
                    return signup("race@example.com", STRONG_PASSWORD).statusCode();
                }));
            }
            start.countDown();

            int created = 0;
            int conflicts = 0;
            for (Future<Integer> result : results) {
                int status = result.get(30, TimeUnit.SECONDS);
                if (status == 201) {
                    created++;
                } else if (status == 409) {
                    conflicts++;
                } else {
                    fail("unexpected status " + status);
                }
            }
            assertEquals(1, created);
            assertEquals(attempts - 1, conflicts);
            assertEquals(1L, userCount());
        } finally {
            pool.shutdownNow();
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "Sh0rt!a",
            "alllowercase1!",
            "ALLUPPERCASE1!",
            "NoDigitsHere!!",
            "NoSpecial123abc",
            "        "
    })
    void signup_WhenPasswordIsWeak_Returns400WithPasswordError(String password) {
        signup(EMAIL, password).then()
                .statusCode(400)
                .contentType(PROBLEM_JSON)
                .body("statusCode", is(400))
                .body("title", equalTo("Bad Request"))
                .body("errors.password", not(emptyOrNullString()))
                .body("errors", not(hasKey("email")));
        assertEquals(0L, userCount());
    }

    @Test
    void signup_WhenPasswordIsLongerThanBcryptCanUse_Returns400WithPasswordError() {
        signup(EMAIL, "Aa1!" + "x".repeat(69)).then()
                .statusCode(400)
                .body("errors.password", not(emptyOrNullString()));
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "   ", "not-an-email", "a@b", "a b@c.com"})
    void signup_WhenEmailIsInvalid_Returns400WithEmailError(String email) {
        signup(email, STRONG_PASSWORD).then()
                .statusCode(400)
                .contentType(PROBLEM_JSON)
                .body("errors.email", not(emptyOrNullString()));
        assertEquals(0L, userCount());
    }

    @Test
    void signup_WhenBodyIsMissing_Returns400() {
        given().contentType(ContentType.JSON)
                .when().post("signup")
                .then()
                .statusCode(400)
                .contentType(PROBLEM_JSON)
                .body("errors.body", not(emptyOrNullString()));
    }

    @Test
    void signup_WhenPasswordIsWeakAndEmailIsRegistered_Returns400InsteadOfRevealingTheAccount() {
        signup(EMAIL, STRONG_PASSWORD).then().statusCode(201);

        signup(EMAIL, "weak").then().statusCode(400);
    }

    private static Response signup(String email, String password) {
        return given()
                .contentType(ContentType.JSON)
                .body(Map.of("email", email, "password", password))
                .when().post("signup")
                .andReturn();
    }

    private static JsonPath claimsOf(String jwt) {
        String payload = jwt.split("\\.")[1];
        return JsonPath.from(new String(Base64.getUrlDecoder().decode(payload), StandardCharsets.UTF_8));
    }

    private User findByEmail(String email) {
        return QuarkusTransaction.requiringNew().call(() -> userRepository.findByEmail(email));
    }

    private long userCount() {
        return QuarkusTransaction.requiringNew().call(() -> userRepository.count());
    }
}
