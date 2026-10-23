package com.musketeers.api;

import com.musketeers.api.auth.AuthController;
import com.musketeers.domain.User;
import com.musketeers.repository.EmailVerificationTokenRepository;
import com.musketeers.repository.UserRepository;
import com.musketeers.service.AuthService;
import com.musketeers.service.EmailVerificationService;
import io.quarkus.elytron.security.common.BcryptUtil;
import io.quarkus.mailer.Mail;
import io.quarkus.mailer.MockMailbox;
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
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

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
    private static final String VERIFICATION_PAGE = "http://localhost:3000/verify-email";
    private static final Pattern TOKEN_IN_LINK = Pattern.compile("token=([A-Za-z0-9_-]+)");

    @Inject
    UserRepository userRepository;

    @Inject
    EmailVerificationTokenRepository tokenRepository;

    @Inject
    MockMailbox mailbox;

    @BeforeEach
    void startFromAnEmptyState() {
        QuarkusTransaction.requiringNew().run(() -> userRepository.deleteAll());
        mailbox.clear();
    }

    @Test
    void signup_CreatesAccountAndReturnsAccessTokenWithoutUserDetails() {
        Response response = signup(EMAIL, STRONG_PASSWORD);

        response.then()
                .statusCode(201)
                .header("Cache-Control", "no-store")
                .body("tokenType", equalTo("Bearer"))
                .body("expiresIn", equalTo(3600))
                .body("accessToken", not(emptyOrNullString()))
                .body("$", not(hasKey("user")));
        assertFalse(response.asString().contains(STRONG_PASSWORD));

        JsonPath claims = claimsOf(response.jsonPath().getString("accessToken"));
        assertEquals(findByEmail(EMAIL).id.toString(), claims.getString("sub"));
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
    void signup_WhenEmailHasCapitals_StoresItLowerCased() {
        signup("Ada@Example.COM", STRONG_PASSWORD).then().statusCode(201);

        assertNotNull(findByEmail(EMAIL));
        assertEquals(1, mailbox.getMailsSentTo(EMAIL).size());
    }

    @Test
    void signup_WhenPasswordIsExactlyTheMaximumLength_Returns201() {
        signup(EMAIL, "Aa1!" + "x".repeat(68)).then().statusCode(201);
    }

    @Test
    void signup_EmailsAVerificationLinkToTheNewAccount() {
        signup(EMAIL, STRONG_PASSWORD).then().statusCode(201);

        List<Mail> mails = mailbox.getMailsSentTo(EMAIL);
        assertEquals(1, mails.size());
        assertTrue(mails.get(0).getText().contains(VERIFICATION_PAGE + "#token="));
        assertFalse(mails.get(0).getText().contains(STRONG_PASSWORD));
    }

    @Test
    void signup_WhenEmailIsAlreadyRegistered_Returns400WithAGenericMessage() {
        signup(EMAIL, STRONG_PASSWORD).then().statusCode(201);

        Response second = signup("ADA@example.com", STRONG_PASSWORD);

        second.then()
                .statusCode(400)
                .contentType(PROBLEM_JSON)
                .body("statusCode", is(400))
                .body("title", equalTo("Bad Request"))
                .body("detail", equalTo(AuthService.SIGNUP_FAILED_MESSAGE))
                .body("$", not(hasKey("errors")));
        assertEquals(1L, userCount());
        assertEquals(1, mailbox.getTotalMessagesSent());
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
            int refused = 0;
            for (Future<Integer> result : results) {
                int status = result.get(30, TimeUnit.SECONDS);
                if (status == 201) {
                    created++;
                } else if (status == 400) {
                    refused++;
                } else {
                    fail("unexpected status " + status);
                }
            }
            assertEquals(1, created);
            assertEquals(attempts - 1, refused);
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
    @ValueSource(strings = {"", "   ", "not-an-email", "@example.com"})
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
    void signup_WhenPasswordIsWeakAndEmailIsRegistered_Returns400BeforeCheckingTheEmail() {
        signup(EMAIL, STRONG_PASSWORD).then().statusCode(201);

        signup(EMAIL, "weak").then().statusCode(400).body("errors.password", not(emptyOrNullString()));
    }

    @Test
    void verifyEmail_WithTheEmailedToken_VerifiesTheEmailAddress() {
        signup(EMAIL, STRONG_PASSWORD).then().statusCode(201);

        verifyEmail(emailedToken()).then().statusCode(204);

        assertNotNull(findByEmail(EMAIL).emailVerifiedAt);
    }

    @Test
    void verifyEmail_WhenTheTokenIsUsedTwice_Returns400TheSecondTime() {
        signup(EMAIL, STRONG_PASSWORD).then().statusCode(201);
        String token = emailedToken();
        verifyEmail(token).then().statusCode(204);

        verifyEmail(token).then()
                .statusCode(400)
                .contentType(PROBLEM_JSON)
                .body("detail", equalTo(EmailVerificationService.INVALID_LINK_MESSAGE));
    }

    @Test
    void verifyEmail_WhenTheTokenIsUnknown_Returns400WithAGenericMessage() {
        signup(EMAIL, STRONG_PASSWORD).then().statusCode(201);

        verifyEmail("not-a-token-that-was-ever-issued").then()
                .statusCode(400)
                .contentType(PROBLEM_JSON)
                .body("detail", equalTo(EmailVerificationService.INVALID_LINK_MESSAGE));
        assertNull(findByEmail(EMAIL).emailVerifiedAt);
    }

    @Test
    void verifyEmail_WhenTheTokenHasExpired_Returns400AndLeavesTheEmailUnverified() {
        signup(EMAIL, STRONG_PASSWORD).then().statusCode(201);
        String token = emailedToken();
        QuarkusTransaction.requiringNew().run(
                () -> tokenRepository.update("expiresAt = ?1", Instant.now().minusSeconds(60)));

        verifyEmail(token).then()
                .statusCode(400)
                .body("detail", equalTo(EmailVerificationService.INVALID_LINK_MESSAGE));
        assertNull(findByEmail(EMAIL).emailVerifiedAt);
    }

    @Test
    void verifyEmail_WhenTheTokenIsBlank_Returns400WithTokenError() {
        verifyEmail("").then()
                .statusCode(400)
                .contentType(PROBLEM_JSON)
                .body("errors.token", not(emptyOrNullString()));
    }

    @Test
    void verifyEmail_WhenBodyIsMissing_Returns400() {
        given().contentType(ContentType.JSON)
                .when().post("verify-email")
                .then()
                .statusCode(400)
                .body("errors.body", not(emptyOrNullString()));
    }

    @Test
    void resendVerification_SendsANewLinkAndStopsTheOldOneWorking() {
        String accessToken = signup(EMAIL, STRONG_PASSWORD).jsonPath().getString("accessToken");
        String oldToken = emailedToken();

        given().header("Authorization", "Bearer " + accessToken)
                .when().post("resend-verification")
                .then().statusCode(204);

        assertEquals(2, mailbox.getMailsSentTo(EMAIL).size());
        String newToken = emailedToken();
        assertNotEquals(oldToken, newToken);
        verifyEmail(oldToken).then().statusCode(400);
        verifyEmail(newToken).then().statusCode(204);
    }

    @Test
    void resendVerification_WithoutAccessToken_Returns401() {
        given().when().post("resend-verification").then().statusCode(401);

        assertEquals(0, mailbox.getTotalMessagesSent());
    }

    @Test
    void resendVerification_WhenEmailIsAlreadyVerified_Returns400AndSendsNothing() {
        String accessToken = signup(EMAIL, STRONG_PASSWORD).jsonPath().getString("accessToken");
        verifyEmail(emailedToken()).then().statusCode(204);
        mailbox.clear();

        given().header("Authorization", "Bearer " + accessToken)
                .when().post("resend-verification")
                .then()
                .statusCode(400)
                .body("detail", equalTo(EmailVerificationService.ALREADY_VERIFIED_MESSAGE));
        assertEquals(0, mailbox.getTotalMessagesSent());
    }

    @Test
    void getVerificationStatus_ReportsWhetherTheEmailAddressIsVerified() {
        String accessToken = signup(EMAIL, STRONG_PASSWORD).jsonPath().getString("accessToken");

        given().header("Authorization", "Bearer " + accessToken)
                .when().get("verification-status")
                .then().statusCode(200).header("Cache-Control", "no-store").body("isVerified", is(false));

        verifyEmail(emailedToken()).then().statusCode(204);

        given().header("Authorization", "Bearer " + accessToken)
                .when().get("verification-status")
                .then().statusCode(200).body("isVerified", is(true));
    }

    @Test
    void getVerificationStatus_WithoutAccessToken_Returns401() {
        given().when().get("verification-status").then().statusCode(401);
    }

    private static Response signup(String email, String password) {
        return given()
                .contentType(ContentType.JSON)
                .body(Map.of("email", email, "password", password))
                .when().post("signup")
                .andReturn();
    }

    private static Response verifyEmail(String token) {
        return given()
                .contentType(ContentType.JSON)
                .body(Map.of("token", token))
                .when().post("verify-email")
                .andReturn();
    }

    private String emailedToken() {
        List<Mail> mails = mailbox.getMailsSentTo(EMAIL);
        String text = mails.get(mails.size() - 1).getText();
        Matcher matcher = TOKEN_IN_LINK.matcher(text);
        assertTrue(matcher.find(), text);
        return matcher.group(1);
    }

    private static JsonPath claimsOf(String jwt) {
        String payload = jwt.split("\\.")[1];
        return JsonPath.from(new String(Base64.getUrlDecoder().decode(payload), StandardCharsets.UTF_8));
    }

    private User findByEmail(String email) {
        return QuarkusTransaction.requiringNew().call(() -> userRepository.findByEmailIgnoreCase(email));
    }

    private long userCount() {
        return QuarkusTransaction.requiringNew().call(() -> userRepository.count());
    }
}
