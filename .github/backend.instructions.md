# AI Coding Instructions for the Backend

These rules apply to all code in the `atlas-api` folder (Java Quarkus backend). Follow them strictly.

When a rule here conflicts with your default habits, the rule wins. When unsure, match the surrounding code.

---

## 1. Architecture and Layering

- **Business logic lives in the service layer.** Controllers and repositories stay light.
- **Controllers**: handle HTTP concerns only (routing, parameter binding, validation annotations, delegating to a service). No business rules, no data access, no mapping logic.
- **Services**: own business rules, orchestration, transactions and validation of business invariants and mapping.
- **Repositories (Panache)**: data access only. No business decisions.
- **Mappers (MapStruct)**: all conversion between entities and DTOs.
- Do not let entities leak out of the service layer into controllers' responses; expose DTOs.

---

## 2. DTOs

- Top-level DTOs (used directly as a request body or response body) follow the naming convention: `NameRequest` / `NameResponse`.
- Nested DTOs (only ever used inside another DTO) follow the naming convention: `NameDto`.
- **Never** use the suffix `Payload`.
- Use **MapStruct** to convert to and from DTOs. Do not hand-write mapping code in services or controllers.

---

## 3. Controllers

- **Return the DTO directly.** Avoid returning `Response` / `ResponseEntity`-style wrappers.
  - The only exception: when you need a body together with a status that does not normally carry one by default (e.g. `201 Created`).
- **Do not use Javadoc in controllers.** Use OpenAPI annotations (`@Tag`, `@Operation`, `@APIResponse`, etc.) for class and method descriptions.

---

## 4. Error Handling

- **Avoid custom exceptions.** Use standard exceptions such as `IllegalArgumentException` with a descriptive message.
- **Avoid exception-specific mappers** (`ExceptionMapper<T>`) wherever possible. Handle errors through the `GlobalExceptionHandler`.
- **Do not catch an exception just to rethrow it** (including wrapping and re-throwing without adding real value). Let it propagate.
- Error messages must be descriptive and say what was wrong and with which value or identifier where safe to do so.

---

## 5. Code Size Limits

- **Methods:** maximum 60 lines. Approaching this means extract helper methods.
- **Classes:** ideally 100 to 300 lines. **PRs with classes over 500 lines should be flagged.**
- **Folders:** past 5 files, split into subfolders by responsibility. Conversely, 5 folders with 1 file each should be questioned.

---

## 6. Naming Conventions

- Casing follows Java and Quarkus conventions (`PascalCase` classes, `camelCase` methods and variables, `lowerdotcase` packages).
- **Constants:** always `SCREAMING_SNAKE_CASE`.
- **Booleans** must start with a verb signalling yes/no: `is`, `has`, `can` (e.g. `isActive`, `hasPermission`). Never bare names like `active`.
- Names must not encode the subfolder/package they live in (no `uiUserCard`, no `apiUserService`).
- **SQL:** commands in `UPPERCASE`; table, column and other object names in `snake_case`.
- DTO naming: see section 2.

---

## 7. Documentation and Comments

### Javadoc is required for
- All classes, **except**:
  - classes inheriting from an interface/abstract class that already carries the comment,
  - MapStruct mappers,
  - Panache repositories.
- All non-constructor methods, **including private ones**, unless the method overrides a parent method that already carries the comment.
- If an overriding method meaningfully diverges from the parent's documented contract, document the child.

### Javadoc is not used for
- Controllers (use OpenAPI annotations instead, see section 3).

### No other comments
- Do not leave inline, block, TODO, or commented-out code comments. PRs doing this should be flagged. Make the code readable through clear names and small methods.
- Only permitted non-Javadoc comments:
  - `// Arrange`, `// Act`, `// Assert` in tests (section 9),
  - the `-- rollback:` comment in migration scripts (section 8).

## 8. Database and Migrations

- Every migration script must end with its rollback, commented out.

Single statement:

```sql
-- rollback: DROP TABLE IF EXISTS roles;
```

Multiple statements:

```sql
-- rollback:
-- DELETE FROM roles
```

- SQL keywords `UPPERCASE`, names `snake_case`.
- Never edit a migration that has already been merged; add a new one.

## 9. Testing

- Tests live in a mirrored `tests/` tree matching the main source structure.
- **Test names:** `<methodName>_<conditionIfAny>_<result>`
  - `getUsers_WhenUserIsNotAdmin_ReturnsForbidden`
  - `getUsers_ReturnsUsers`
- **AAA comments:** every test, **except integration tests**, must contain `// Arrange`, `// Act` and `// Assert` marking each section. Omit a marker only if that section is empty.
- Maintain **80% test coverage**. New code should come with tests.

Example:

```java
@Test
void getUsers_WhenUserIsNotAdmin_ReturnsForbidden() {
    // Arrange
    when(securityContext.isUserInRole("admin")).thenReturn(false);

    // Act
    Executable action = () -> userService.getUsers();

    // Assert
    assertThrows(ForbiddenException.class, action);
}
```

## 10. Type Safety

- `any`-equivalents are not allowed outside tests: no raw types, no unnecessary `Object`, no unchecked casts or blanket `@SuppressWarnings("unchecked")`. Use proper generics and specific types.

## 11. Formatting

- Formatting is handled by the provided IDE config (IntelliJ and VS Code). That should be used rather than user defaults.
- Do not manually override or fight automated formatting.

## 12. Dependency Injection and Quarkus Conventions

- Prefer constructor injection over field injection.
- Use the narrowest CDI scope that works (`@ApplicationScoped` by default for services).
- Put `@Transactional` on service methods, not controllers or repositories.
- Configuration comes from `application.yml` / `@ConfigMapping`, never hard-coded values.

## 13. Logging

- Use the project's standard logger (e.g. `org.jboss.logging.Logger`), never `System.out` / `printStackTrace()`.
- Never log secrets, tokens, passwords or personal data.
- Log at the boundary where an error is actually handled, not at every layer it passes through.

## 14. Security and Validation

- Validate request DTOs with Bean Validation annotations (`@NotNull`, `@Valid`, etc.).
- Never trust client-supplied identifiers for authorization; check permissions in the service layer.
- No secrets or credentials in code or committed config.

## 15. Before You Finish: Checklist

- [ ] Business logic is in services; controllers/repositories are thin
- [ ] DTOs named `NameRequest` / `NameResponse` / `NameDto` (never `Payload`), mapped with MapStruct
- [ ] Controllers return DTOs directly (wrapper only for body + status like 201)
- [ ] No custom exceptions, no new exception mappers, no catch-and-rethrow
- [ ] Methods ≤ 60 lines, classes ≤ 300 lines (never > 500)
- [ ] Booleans start with `is` / `has` / `can`; constants are `SCREAMING_SNAKE_CASE`
- [ ] Javadoc on all required classes and methods; OpenAPI (not Javadoc) in controllers
- [ ] No other comments anywhere
- [ ] Migrations end with a commented `-- rollback:`
- [ ] Tests added, named `<method>_<condition>_<result>`, with AAA comments