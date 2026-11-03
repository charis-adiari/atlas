# AI Coding Instructions for the Backend

These rules apply to all code in the `atlas-api` folder (Java Quarkus backend). Follow them strictly.

They are in addition to shared.instructions.md, which covers naming, documentation comments, the no-comments rule, type safety, formatting and testing rules common to backend and frontend. Read both.

PRs that break the rules marked **(Can't approve)** should always be reported as 🟡 Required and force needing changes.

When a rule here conflicts with your default habits, the rule wins. When unsure, match the surrounding code.

## 1. Architecture and Layering

- **Business logic lives in the service layer.** Controllers and repositories stay light.
- **Controllers**: handle HTTP concerns only (routing, parameter binding, validation annotations, delegating to a service). No business rules, no data access, no mapping logic.
- **Services**: own business rules, orchestration, transactions and validation of business invariants and mapping.
- **Repositories (Panache)**: data access only. No business decisions.
- **Mappers (MapStruct)**: all conversion between entities and DTOs.
- Do not let entities leak out of the service layer into controllers' responses; expose DTOs.

## 2. DTOs

- Naming follows `shared.instructions.md` (`NameRequest` / `NameResponse` / `NameDto`, never `Payload`).
- Use **MapStruct** to convert to and from DTOs. Do not hand-write mapping code in services or controllers.

## 3. Controllers

- **Return the DTO directly.** Do not return `Response` / `ResponseEntity`-style wrappers.
  - The only exception: when you need a body together with a status that does not normally carry one by default (e.g. `201 Created`).
- **Do not use Javadoc in controllers.** Use OpenAPI annotations (`@Tag`, `@Operation`, `@APIResponse`, etc.) for class and method descriptions.

## 4. Error Handling

- **Avoid custom exceptions.** Use standard exceptions such as `IllegalArgumentException` with a descriptive message.
- **Avoid exception-specific mappers** (`ExceptionMapper<T>`) wherever possible. Handle errors through the `GlobalExceptionHandler`.
- **Do not catch an exception just to rethrow it** (including wrapping and re-throwing without adding real value). Let it propagate.
- Error messages must be descriptive and say what was wrong and with which value or identifier where safe to do so.

## 5. Naming (Backend Specifics)
- Casing follows Java and Quarkus conventions (`PascalCase` classes, `camelCase` methods and variables, `lowerdotcase` packages).
- **SQL:** commands in `UPPERCASE`; table, column and other object names in `snake_case`.

## 6. Documentation and Comments

Use Javadoc, following the rules in `shared.instructions.md`, with these backend specifics:

- Classes that do not need Javadoc, in addition to those inheriting an already-documented parent:
  - MapStruct mappers
- **Controllers use no Javadoc.** Use OpenAPI annotations instead (see section 3).
- The only non-Javadoc comments permitted are the AAA markers in tests and the `-- rollback:` comment and a single-line header comment in migration scripts (section 7).

## 7. Database and Migrations

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

- A header is allowed in comments at the top. It must be a single line. E.g. `-- V1.0.0. Create roles table`
- SQL keywords `UPPERCASE`, names `snake_case`.
- Never edit a migration that has already been merged; add a new one.

## 8. Testing (Backend Specifics)

- Tests live in a mirrored `tests/` tree matching the main source structure.
- **Test names:** `<methodName>_<conditionIfAny>_<result>`
  - `getUsers_WhenUserIsNotAdmin_ReturnsForbidden`
  - `getUsers_ReturnsUsers`
- AAA comments are required in every test, **except integration tests** (see `shared.instructions.md`)

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

## 9. Type Safety (Backend Specifics)

- `any`-equivalents in Java are: raw types, unnecessary `Object`, unchecked casts and blanket `@SuppressWarnings("unchecked")`. Use proper generics and specific types. All except suppressing warnings are allowed in tests only.

## 10. Formatting (Backend Specifics)

- Formatting is handled by the provided IDE config (IntelliJ and VS Code). That should be used rather than user defaults.

## 11. Dependency Injection and Quarkus Conventions

- Prefer constructor injection over field injection.
- Use the narrowest CDI scope that works (`@ApplicationScoped` by default for services).
- Put `@Transactional` on service methods, not controllers or repositories.
- Configuration comes from `application.yml` / `@ConfigMapping`, never hard-coded values.

## 12. Logging

- Use the project's standard logger (e.g. `org.jboss.logging.Logger`), never `System.out` / `printStackTrace()`.
- Never log secrets, tokens, passwords or personal data.
- Log at the boundary where an error is actually handled, not at every layer it passes through.

## 13. Security and Validation

- Validate request DTOs with Bean Validation annotations (`@NotNull`, `@Valid`, etc.).
- Never trust client-supplied identifiers for authorization; check permissions in the service layer.
- No secrets or credentials in code or committed config.

## 14. Before You Finish: Checklist

Complete the shared checklist in `shared.instructions.md`, then:
- [ ] Business logic is in services; controllers/repositories are thin
- [ ] DTOs mapped with MapStruct
- [ ] Controllers return DTOs directly (wrapper only for body + status like 201); no Javadoc in controllers
- [ ] No custom exceptions, no new exception mappers, no catch-and-rethrow
- [ ] Methods ≤ 60 lines, classes ≤ 300 lines (never > 500)
- [ ] BNo Javadoc on MapStruct mappers
- [ ] Migrations end with a commented `-- rollback:`
- [ ] Tests named `<method>_<condition>_<result>`, in the mirrored `tests/` tree