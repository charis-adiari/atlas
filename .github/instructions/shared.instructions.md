# Shared AI Coding Instructions

These rules apply to **all** Atlas code, backend and frontend. They are read together with `backend.instructions.md` and, or `frontend.instructions.md`. Where a stack-specific file is more specific than this one, the stack-specific file wins.

PRs that break the rules marked **(Can't approve)** should always be reported as 🟡 Required and force needing changes.

## 1. Naming Conventions

- Casing follows the conventions of the language and tool you are working in (Java and Quarkus on the backend, React and Next.js on the frontend).
- **Constants:** always `SCREAMING_SNAKE_CASE`.
- **Booleans** must start with a verb signalling yes/no: `is`, `has`, `can` (e.g. `isActive`, `hasPermission`). Never bare names like `active`.
- Names must not encode the folder or package they live in (no `uiUserCard`, no `apiUserService`).
- **DTO names** are the same on backend and frontend:
  - Top-level request / response types: `NameRequest` / `NameResponse`.
  - Types only ever used inside another DTO: `NameDto`.
  - **Never** use `Payload` in a DTO name.

## 2. Documentation Comments

Documentation comments (Javadoc on the backend, TSDoc on the frontend) are generally required for:

- All classes, unless inherited from an interface or abstract class that already carries the comment.
- All non-constructor methods, **including private ones**, unless overriding a parent interface or abstract class method that already carries the comment.

If overridden behaviour diverges meaningfully from the parent's documented contract, document the child.

The stack-specific files list additional inclusions and exclusions.

## 3. No Other Comments **(Can't approve)**

- Do not leave inline, block, or commented-out code comments. Write code that is readable through obvious names and small functions.
- Permitted non-documentation comments:
  - `// Arrange`, `// Act`, `// Assert` in tests (see section 6).
  - Any further exceptions listed in the stack-specific file.
  - A TODO that references an issue number, e.g. `// TODO #1234: remove once the new endpoint ships`.

## 4. Type Safety

- `any`-equivalents are not allowed, except in tests.
- Use specific types and proper generics instead. The stack-specific files list what counts as an `any`-equivalent in each language.

## 5. Formatting

- Formatting is automated. Use the project's configured tooling rather than your own defaults.
- Do not manually override automated formatting or disable rules to get around a violation.

## 6. Testing

- **Every test, excluding integration tests, must include AAA comments** (`// Arrange`, `// Act`, `// Assert`) marking each section, unless the section is empty.
- Maintain **80% test coverage**. New code should come with tests.
- Test file location and test naming formats are defined in the stack-specific files.

## 7. Code Size Limits
- **Methods:** maximum 60 lines. Approaching this means extract helper methods.
- **Classes:** ideally 100 to 300 lines. **Classes over 500 lines should not be approved (Can't approve).**
- **Folders:** past 5 files, split into subfolders by responsibility. Conversely, 5 folders with 1 file each should be questioned.
- **PRs:** keep under 30 changed files. Over 50 should be reported as finding

## 8. Miscellaneous
- Failure paths are handled explicitly — no swallowed exceptions, no unhandled cases that surface as a 500 or a silent no-op, no exception details or PII leaked in responses or logs.
- Suppressing warnings is a code smell **(Can't approve)**

## 9. Before You Finish: Shared Checklist

- [ ] Casing, constants and boolean names follow section 1
- [ ] No folder or package names encoded in identifiers
- [ ] DTOs named `NameRequest` / `NameResponse` / `NameDto`, never `Payload`
- [ ] Documentation comments on all required classes and methods
- [ ] No other comments other than TODOs with an issue number and AAA markers in tests **(Can't approve)**
- [ ] No `any`-equivalents outside tests
- [ ] Automated formatting applied and not overridden
- [ ] Tests added with AAA comments; coverage stays at or above 80%