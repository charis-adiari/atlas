package com.musketeers.api;

import com.musketeers.api.auth.AuthController;
import com.musketeers.domain.User;
import com.musketeers.repository.EmailVerificationTokenRepository;
import com.musketeers.repository.UserRepository;
import com.musketeers.service.AuthService;
import com.musketeers.service.EmailNotVerifiedException;
import com.musketeers.service.EmailVerificationService;
import com.musketeers.service.ResendVerificationLimiter;
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

    @Inject
    ResendVerificationLimiter resendLimiter;

    @BeforeEach
    void startFromAnEmptyState() {
        QuarkusTransaction.requiringNew().run(() -> userRepository.deleteAll());
        mailbox.clear();
        resendLimiter.reset();
    }

    @Test
    void signup_CreatesAccountAndReportsThatVerificationIsRequiredWithoutAnAccessToken() {
        Response response = signup("Ada@Example.COM", STRONG_PASSWORD);

        response.then()
                .statusCode(201)
                .header("Cache-Control", "no-store")
                .body("status", equalTo("verification_required"))
                .body("email", equalTo(EMAIL))
                .body("$", not(hasKey("accessToken")));
        assertFalse(response.asString().contains(STRONG_PASSWORD));
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
    void verifyEmail_WithTheEmailedToken_VerifiesTheEmailAddressAndSignsTheUserIn() {
        signup(EMAIL, STRONG_PASSWORD).then().statusCode(201);

        Response response = verifyEmail(emailedToken());

        response.then()
                .statusCode(200)
                .header("Cache-Control", "no-store")
                .body("tokenType", equalTo("Bearer"))
                .body("expiresIn", equalTo(3600))
                .body("accessToken", not(emptyOrNullString()))
                .body("$", not(hasKey("user")));
        User stored = findByEmail(EMAIL);
        assertNotNull(stored.emailVerifiedAt);

        JsonPath claims = claimsOf(response.jsonPath().getString("accessToken"));
        assertEquals(stored.id.toString(), claims.getString("sub"));
        assertEquals("atlas", claims.getString("iss"));
        assertEquals(EMAIL, claims.getString("email"));
        assertTrue(claims.getList("groups", String.class).contains("user"));
        assertTrue(claims.getLong("exp") > claims.getLong("iat"));
    }

    @Test
    void verifyEmail_WhenTheTokenIsUsedTwice_Returns400TheSecondTime() {
        signup(EMAIL, STRONG_PASSWORD).then().statusCode(201);
        String token = emailedToken();
        verifyEmail(token).then().statusCode(200);

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
    void login_WhenEmailIsVerified_ReturnsAnAccessToken() {
        signup(EMAIL, STRONG_PASSWORD).then().statusCode(201);
        verifyEmail(emailedToken()).then().statusCode(200);

        Response response = login("Ada@Example.COM", STRONG_PASSWORD);

        response.then()
                .statusCode(200)
                .header("Cache-Control", "no-store")
                .body("tokenType", equalTo("Bearer"))
                .body("accessToken", not(emptyOrNullString()));
        JsonPath claims = claimsOf(response.jsonPath().getString("accessToken"));
        assertEquals(findByEmail(EMAIL).id.toString(), claims.getString("sub"));
    }

    @Test
    void login_WhenPasswordIsRightButEmailIsUnverified_Returns403WithEmailNotVerifiedCode() {
        signup(EMAIL, STRONG_PASSWORD).then().statusCode(201);

        login(EMAIL, STRONG_PASSWORD).then()
                .statusCode(403)
                .contentType(PROBLEM_JSON)
                .body("statusCode", is(403))
                .body("code", equalTo(EmailNotVerifiedException.CODE))
                .body("detail", equalTo(EmailNotVerifiedException.MESSAGE))
                .body("$", not(hasKey("accessToken")));
    }

    @Test
    void login_WhenPasswordIsWrongAndEmailIsUnverified_Returns401WithoutRevealingTheAccount() {
        signup(EMAIL, STRONG_PASSWORD).then().statusCode(201);

        Response wrongPassword = login(EMAIL, "Wr0ng!Pass");
        Response unknownEmail = login("nobody@example.com", "Wr0ng!Pass");

        wrongPassword.then()
                .statusCode(401)
                .contentType(PROBLEM_JSON)
                .body("detail", equalTo(AuthService.INVALID_CREDENTIALS_MESSAGE))
                .body("$", not(hasKey("code")));
        assertEquals(unknownEmail.statusCode(), wrongPassword.statusCode());
        assertEquals(unknownEmail.jsonPath().getString("detail"), wrongPassword.jsonPath().getString("detail"));
    }

    @Test
    void login_WhenPasswordIsWrongAndEmailIsVerified_Returns401() {
        signup(EMAIL, STRONG_PASSWORD).then().statusCode(201);
        verifyEmail(emailedToken()).then().statusCode(200);

        login(EMAIL, "Wr0ng!Pass").then()
                .statusCode(401)
                .body("detail", equalTo(AuthService.INVALID_CREDENTIALS_MESSAGE));
    }

    @Test
    void login_WhenFieldsAreMissing_Returns400WithFieldErrors() {
        login("", "").then()
                .statusCode(400)
                .contentType(PROBLEM_JSON)
                .body("errors.email", not(emptyOrNullString()))
                .body("errors.password", not(emptyOrNullString()));
    }

    @Test
    void resendVerification_WithoutAccessToken_SendsANewLinkAndStopsTheOldOneWorking() {
        signup(EMAIL, STRONG_PASSWORD).then().statusCode(201);
        String oldToken = emailedToken();

        resendVerification("Ada@Example.COM").then().statusCode(202);

        assertEquals(2, mailbox.getMailsSentTo(EMAIL).size());
        String newToken = emailedToken();
        assertNotEquals(oldToken, newToken);
        verifyEmail(oldToken).then().statusCode(400);
        verifyEmail(newToken).then().statusCode(200);
    }

    @Test
    void resendVerification_WhenNoAccountUsesTheEmail_Returns202AndSendsNothing() {
        resendVerification("nobody@example.com").then().statusCode(202);

        assertEquals(0, mailbox.getTotalMessagesSent());
    }

    @Test
    void resendVerification_WhenEmailIsAlreadyVerified_Returns202AndSendsNothing() {
        signup(EMAIL, STRONG_PASSWORD).then().statusCode(201);
        verifyEmail(emailedToken()).then().statusCode(200);
        mailbox.clear();

        resendVerification(EMAIL).then().statusCode(202);

        assertEquals(0, mailbox.getTotalMessagesSent());
    }

    @Test
    void resendVerification_WhenTheEmailIsOverItsLimit_StillReturns202ButSendsNothingMore() {
        signup(EMAIL, STRONG_PASSWORD).then().statusCode(201);
        mailbox.clear();

        for (int i = 0; i < 4; i++) {
            resendVerification(EMAIL).then().statusCode(202);
        }

        assertEquals(3, mailbox.getMailsSentTo(EMAIL).size());
    }

    @Test
    void resendVerification_WhenTheClientIsOverItsLimit_Returns429() {
        for (int i = 0; i < 20; i++) {
            resendVerification("person" + i + "@example.com").then().statusCode(202);
        }

        resendVerification("one-more@example.com").then()
                .statusCode(429)
                .contentType(PROBLEM_JSON)
                .body("detail", equalTo(EmailVerificationService.TOO_MANY_REQUESTS_MESSAGE));
    }

    @Test
    void resendVerification_WhenEmailIsInvalid_Returns400WithEmailError() {
        resendVerification("not-an-email").then()
                .statusCode(400)
                .body("errors.email", not(emptyOrNullString()));
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

    private static Response login(String email, String password) {
        return given()
                .contentType(ContentType.JSON)
                .body(Map.of("email", email, "password", password))
                .when().post("login")
                .andReturn();
    }

    private static Response resendVerification(String email) {
        return given()
                .contentType(ContentType.JSON)
                .body(Map.of("email", email))
                .when().post("resend-verification")
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
