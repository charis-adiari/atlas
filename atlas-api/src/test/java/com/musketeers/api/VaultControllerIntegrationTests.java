package com.musketeers.api;

import com.musketeers.api.vaults.VaultController;
import com.musketeers.domain.User;
import com.musketeers.domain.vault.FileType;
import com.musketeers.domain.vault.Folder;
import com.musketeers.domain.vault.Vault;
import com.musketeers.domain.vault.VaultFile;
import com.musketeers.repository.UserRepository;
import com.musketeers.service.TokenService;
import com.musketeers.service.migration.MigrationService;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.common.http.TestHTTPEndpoint;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import io.restassured.response.ValidatableResponse;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Callable;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.emptyOrNullString;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

@QuarkusTest
@TestHTTPEndpoint(VaultController.class)
public class VaultControllerIntegrationTests {
    private static final String PROBLEM_JSON = "application/problem+json";
    private static final String CREATED_AT = "2025-01-02T03:04:05Z";

    @Inject
    UserRepository userRepository;

    @Inject
    TokenService tokenService;

    @Inject
    EntityManager entityManager;

    @BeforeEach
    void startFromAnEmptyDatabase() {
        QuarkusTransaction.requiringNew().run(() -> userRepository.deleteAll());
    }

    @Test
    void migrate_StoresEverythingForTheSignedInUserKeepingIdsAndTimestamps() {
        User user = createUser("ada@example.com");
        UUID vaultA = UUID.randomUUID();
        UUID vaultB = UUID.randomUUID();
        UUID root = UUID.randomUUID();
        UUID child = UUID.randomUUID();
        UUID otherRoot = UUID.randomUUID();
        UUID note = UUID.randomUUID();
        UUID canvas = UUID.randomUUID();
        UUID otherNote = UUID.randomUUID();
        Map<String, Object> payload = Map.of(
                "vaults", List.of(vault(vaultA, "Work"), vault(vaultB, "Home")),
                "folders", List.of(
                        folder(child, vaultA, root),
                        folder(root, vaultA, null),
                        folder(otherRoot, vaultB, null)),
                "files", List.of(
                        file(note, vaultA, child, "note", "Ideas"),
                        file(canvas, vaultA, null, "canvas", "Board"),
                        file(otherNote, vaultB, otherRoot, "note", "Groceries")),
                "backlinks", List.of(link(note, canvas), link(note, canvas))
        );

        Instant before = Instant.now().truncatedTo(ChronoUnit.MILLIS);

        migrate(tokenFor(user), payload).statusCode(201).body(emptyOrNullString());

        assertEquals(2L, count("vaults", user.id));
        assertEquals(3L, count("folders", user.id));
        assertEquals(3L, count("files", user.id));
        assertEquals(1L, count("backlinks", user.id));
        assertEquals(user.id, inTransaction(() -> entityManager.find(Vault.class, vaultA)).userId);
        assertEquals(user.id, inTransaction(() -> entityManager.find(Vault.class, vaultB)).userId);
        assertEquals(root, inTransaction(() -> entityManager.find(Folder.class, child)).parentFolderId);
        VaultFile stored = inTransaction(() -> entityManager.find(VaultFile.class, note));
        assertEquals(Instant.parse(CREATED_AT), stored.createdAt);
        assertFalse(stored.lastUpdatedAt.isBefore(before));
        assertEquals(FileType.NOTE, stored.type);
        assertEquals("Content of Ideas", stored.content);
    }

    @Test
    void migrate_WhenNothingIsUploaded_Returns201() {
        User user = createUser("ada@example.com");

        migrate(tokenFor(user), Map.of()).statusCode(201).body(emptyOrNullString());
    }

    @Test
    void migrate_WhenPayloadNamesAnotherOwner_IgnoresItAndUsesTheSignedInUser() {
        User user = createUser("ada@example.com");
        User other = createUser("grace@example.com");
        UUID vaultId = UUID.randomUUID();
        Map<String, Object> spoofed = Map.of(
                "id", vaultId.toString(),
                "name", "Mine",
                "createdAt", CREATED_AT,
                "userId", other.id.toString());

        migrate(tokenFor(user), Map.of("userId", other.id.toString(), "vaults", List.of(spoofed)))
                .statusCode(201);

        assertEquals(user.id, inTransaction(() -> entityManager.find(Vault.class, vaultId)).userId);
        assertEquals(0L, count("vaults", other.id));
    }

    @Test
    void migrate_WithoutToken_Returns401AndStoresNothing() {
        User user = createUser("ada@example.com");

        given().contentType(ContentType.JSON)
                .body(Map.of("vaults", List.of(vault(UUID.randomUUID(), "Work"))))
                .when().post("migrate")
                .then().statusCode(401);

        assertEquals(0L, count("vaults", user.id));
    }

    @Test
    void migrate_WithInvalidToken_Returns401() {
        given().contentType(ContentType.JSON)
                .header("Authorization", "Bearer not.a.token")
                .body(Map.of())
                .when().post("migrate")
                .then().statusCode(401);
    }

    @Test
    void migrate_WhenEmailIsNotVerified_Returns403AndStoresNothing() {
        User user = createUnverifiedUser("ada@example.com");

        migrate(tokenFor(user), Map.of("vaults", List.of(vault(UUID.randomUUID(), "Work"))))
                .statusCode(403)
                .contentType(PROBLEM_JSON)
                .body("detail", equalTo(MigrationService.UNVERIFIED_EMAIL_MESSAGE));

        assertEquals(0L, count("vaults", user.id));
    }

    @Test
    void migrate_WhenAccountNoLongerExists_Returns404() {
        User user = createUser("ada@example.com");
        String token = tokenFor(user);
        QuarkusTransaction.requiringNew().run(() -> userRepository.deleteAll());

        migrate(token, Map.of()).statusCode(404).contentType(PROBLEM_JSON);
    }

    @Test
    void migrate_WhenAFileReferencesAFolderThatWasNotUploaded_Returns400AndStoresNothing() {
        User user = createUser("ada@example.com");
        UUID vaultId = UUID.randomUUID();
        UUID missingFolder = UUID.randomUUID();
        Map<String, Object> payload = Map.of(
                "vaults", List.of(vault(vaultId, "Work")),
                "folders", List.of(folder(UUID.randomUUID(), vaultId, null)),
                "files", List.of(file(UUID.randomUUID(), vaultId, missingFolder, "note", "Lost"))
        );

        migrate(tokenFor(user), payload).statusCode(400)
                .contentType(PROBLEM_JSON)
                .body("statusCode", is(400))
                .body("detail", containsString(missingFolder.toString()));

        assertEquals(0L, count("vaults", user.id));
        assertEquals(0L, count("folders", user.id));
    }

    @Test
    void migrate_WhenFoldersFormACycle_Returns400AndStoresNothing() {
        User user = createUser("ada@example.com");
        UUID vaultId = UUID.randomUUID();
        UUID first = UUID.randomUUID();
        UUID second = UUID.randomUUID();
        Map<String, Object> payload = Map.of(
                "vaults", List.of(vault(vaultId, "Work")),
                "folders", List.of(folder(first, vaultId, second), folder(second, vaultId, first))
        );

        migrate(tokenFor(user), payload).statusCode(400).body("detail", containsString("cycle"));

        assertEquals(0L, count("vaults", user.id));
    }

    @Test
    void migrate_WhenFieldsAreInvalid_Returns400WithAPositionedErrorPerField() {
        User user = createUser("ada@example.com");
        UUID vaultId = UUID.randomUUID();
        Map<String, Object> badFile = file(UUID.randomUUID(), vaultId, null, "note", " ");
        badFile.remove("createdAt");
        Map<String, Object> payload = Map.of(
                "vaults", List.of(vault(vaultId, "Work")),
                "files", List.of(badFile)
        );

        migrate(tokenFor(user), payload).statusCode(400)
                .contentType(PROBLEM_JSON)
                .body("errors.keySet()", hasItem("files[0].createdAt"))
                .body("errors.keySet()", hasItem("files[0].name"));

        assertEquals(0L, count("vaults", user.id));
    }

    @Test
    void migrate_WhenAFileTypeIsUnknown_Returns400AndStoresNothing() {
        User user = createUser("ada@example.com");
        UUID vaultId = UUID.randomUUID();
        Map<String, Object> payload = Map.of(
                "vaults", List.of(vault(vaultId, "Work")),
                "files", List.of(file(UUID.randomUUID(), vaultId, null, "pdf", "Report"))
        );

        migrate(tokenFor(user), payload).statusCode(400);

        assertEquals(0L, count("vaults", user.id));
    }

    @Test
    void migrate_WhenAnIdIsNotAUuid_Returns400() {
        User user = createUser("ada@example.com");

        migrate(tokenFor(user), Map.of("vaults", List.of(Map.of("id", "not-a-uuid", "name", "Work"))))
                .statusCode(400);
    }

    @Test
    void migrate_WhenAListHasANullEntry_Returns400() {
        User user = createUser("ada@example.com");

        migrate(tokenFor(user), Map.of("vaults", Arrays.asList((Object) null)))
                .statusCode(400)
                .contentType(PROBLEM_JSON)
                .body("detail", containsString("empty entry"));
    }

    @Test
    void migrate_WhenBodyIsMissing_Returns400() {
        User user = createUser("ada@example.com");

        given().contentType(ContentType.JSON)
                .header("Authorization", "Bearer " + tokenFor(user))
                .when().post("migrate")
                .then().statusCode(400)
                .body("errors.body", not(emptyOrNullString()));
    }

    @Test
    void migrate_WhenAnIdBelongsToAnotherUser_Returns400AndRollsBackEverythingElse() {
        User first = createUser("ada@example.com");
        User second = createUser("grace@example.com");
        UUID takenFile = UUID.randomUUID();
        UUID firstVault = UUID.randomUUID();
        migrate(tokenFor(first), Map.of(
                "vaults", List.of(vault(firstVault, "Taken")),
                "files", List.of(file(takenFile, firstVault, null, "note", "Taken"))
        )).statusCode(201);

        UUID secondVault = UUID.randomUUID();
        UUID secondFolder = UUID.randomUUID();
        Map<String, Object> clashing = Map.of(
                "vaults", List.of(vault(secondVault, "Fresh")),
                "folders", List.of(folder(secondFolder, secondVault, null)),
                "files", List.of(file(takenFile, secondVault, secondFolder, "note", "Clash"))
        );

        migrate(tokenFor(second), clashing).statusCode(400)
                .contentType(PROBLEM_JSON)
                .body("statusCode", is(400))
                .body("detail", equalTo(MigrationService.NOT_SAVED_MESSAGE));

        assertEquals(0L, count("vaults", second.id));
        assertEquals(0L, count("folders", second.id));
        assertEquals(0L, count("files", second.id));
        assertEquals(1L, count("files", first.id));
    }

    @Test
    void migrate_WhenTheSamePayloadIsSentTwice_Returns400AndKeepsTheFirstCopy() {
        User user = createUser("ada@example.com");
        UUID vaultId = UUID.randomUUID();
        Map<String, Object> payload = Map.of(
                "vaults", List.of(vault(vaultId, "Work")),
                "files", List.of(file(UUID.randomUUID(), vaultId, null, "note", "Once"))
        );
        String token = tokenFor(user);
        migrate(token, payload).statusCode(201);

        migrate(token, payload).statusCode(400);

        assertEquals(1L, count("vaults", user.id));
        assertEquals(1L, count("files", user.id));
    }

    private ValidatableResponse migrate(String token, Object payload) {
        return given()
                .contentType(ContentType.JSON)
                .header("Authorization", "Bearer " + token)
                .body(payload)
                .when().post("migrate")
                .then();
    }

    private User createUser(String email) {
        return createUser(email, Instant.now());
    }

    private User createUnverifiedUser(String email) {
        return createUser(email, null);
    }

    private User createUser(String email, Instant verifiedAt) {
        return inTransaction(() -> {
            User user = new User();
            user.email = email;
            user.passwordHash = "not-a-real-hash";
            user.emailVerifiedAt = verifiedAt;
            userRepository.persist(user);
            return user;
        });
    }

    private String tokenFor(User user) {
        return tokenService.issue(user);
    }

    private long count(String table, UUID userId) {
        String sql = table.equals("vaults")
                ? "select count(*) from vaults where user_id = :u"
                : "select count(*) from " + table + " t join vaults v on v.id = t.vault_id where v.user_id = :u";
        return inTransaction(() -> ((Number) entityManager.createNativeQuery(sql)
                .setParameter("u", userId)
                .getSingleResult()).longValue());
    }

    private static <T> T inTransaction(Callable<T> work) {
        return QuarkusTransaction.requiringNew().call(work);
    }

    private static Map<String, Object> vault(UUID id, String name) {
        return Map.of("id", id.toString(), "name", name, "createdAt", CREATED_AT);
    }

    private static Map<String, Object> folder(UUID id, UUID vaultId, UUID parentId) {
        return parentId == null
                ? Map.of("id", id.toString(), "vaultId", vaultId.toString(), "name", "Folder",
                        "createdAt", CREATED_AT)
                : Map.of("id", id.toString(), "vaultId", vaultId.toString(), "parentFolderId", parentId.toString(),
                        "name", "Folder", "createdAt", CREATED_AT);
    }

    private static Map<String, Object> file(UUID id, UUID vaultId, UUID folderId, String type, String name) {
        Map<String, Object> file = new HashMap<>();
        file.put("id", id.toString());
        file.put("vaultId", vaultId.toString());
        file.put("type", type);
        file.put("name", name);
        file.put("content", "Content of " + name);
        file.put("createdAt", CREATED_AT);
        if (folderId != null) {
            file.put("folderId", folderId.toString());
        }
        return file;
    }

    private static Map<String, Object> link(UUID source, UUID target) {
        return Map.of("sourceFileId", source.toString(), "targetFileId", target.toString());
    }
}
