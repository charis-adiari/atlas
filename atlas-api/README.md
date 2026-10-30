# atlas-api

This project uses Java Quarkus.

## Table of Contents
1. [Environment Setup](#environment-setup)
1. [Email Verification](#email-verification)
1. [Database Setup](#database-setup)
1. [Code Style Guide](#code-style-guide)

---

## Environment Setup

1. Copy the example file to create your own `.env`:

   ```bash
   cp .env.example .env
   ```

1. Fill in the actual values in `.env`. For the database password, any value will do for local dev.
1. If you add a new environment variable, add its key (with a placeholder or blank value) to `.env.example` so others know it's needed.
1. Create a key pair for the access tokens: the private key signs the access token issued at signup and the public key
   verifies it on protected endpoints. Both keys are read from environment variables, never from files, so nothing
   secret is stored in the project. Every developer makes their own pair. Run this in Git Bash (Git for Windows ships
   `openssl`) from any folder outside the project:

   ```bash
   openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out privateKey.pem
   openssl rsa -in privateKey.pem -pubout -out publicKey.pem
   grep -v '^-----' privateKey.pem | tr -d '\r\n'
   grep -v '^-----' publicKey.pem | tr -d '\r\n'
   ```

   Put the first printed line (a single line, without the `-----BEGIN` and `-----END` lines) after
   `ACCESS_TOKEN_PRIVATE_KEY=` in `.env`, and the second after `ACCESS_TOKEN_PUBLIC_KEY=`. Then delete the two `.pem`
   files. The app refuses to start if either is missing. Tests use their own throw-away pair, written directly in the 
   `%test` section of `application.yml`.
1. Generating the pepper for email verification codes: email verification codes are hashed with HMAC-SHA256 using a
   secret key (the "pepper"). It must be 32 random bytes, Base64-encoded, and supplied through the
   `VERIFICATION_CODE_PEPPER` environment variable. 

    ```bash
    openssl rand -base64 32
    ```

    The output is a 44-character string ending in =, for example q3Zk...=.

## Email Verification

Signup creates the account, emails a verification link and signs the user in. Until the link is opened, protected
endpoints that store data (such as `POST /vaults/migrate`) answer 403. The link opens the page at
`app.auth.verification-page-address` with `#token=...` added (a fragment, so the token never reaches a server log or a
referrer header), and that page reads it in the browser, removes it from the address bar and sends it to
`POST /api/v1/auth/verify-email`. The endpoints `POST /api/v1/auth/resend-verification` and
`GET /api/v1/auth/verification-status` need the signed-in user's access token.

- In dev and test mode no email is really sent: Quarkus prints it to the console, so copy the link from there.
- `app.auth.verification-token-lifetime` (default in `application.yml`: `PT24H`) is how long a link stays valid.
- Neither setting has a default in code, so the app refuses to start when one is missing.
- In production set these environment variables: `VERIFICATION_PAGE_ADDRESS`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`
  and `MAIL_PASSWORD`.

## Database Setup

The app connects to a local PostgreSQL instance running in a container, managed via Docker Compose. It is recommended
to use Rancher Desktop to manage the containers. A guide to install it can be found in the
[onboarding doc](../.wiki/01-onboarding.md#tools-for-the-database).

### 1. Start the database

From the API project root run:

```bash
docker compose up -d
```

This starts a PostgreSQL container in the background. Postgres will be available at `localhost:5432`. When you open
Rancher Desktop > Containers, you should see the running container.

### 2. Run the app

Once the DB is up, run the app in dev mode (which enables live coding):

```bash
mvn clean quarkus:dev
```

In IntelliJ, you can add a reusable run configuration:
- Create a maven configuration named `atlas-api`
- For the run script, enter `clean quarkus:dev`

Once the app is running, you can access the Swagger UI at <localhost:8080/q/swagger-ui>.
> **_NOTE:_**  Quarkus also now ships with a Dev UI, which is available in dev mode only at <http://localhost:8080/q/dev/>.

### Stopping the database

```bash
docker compose down
```

This stops the container but preserves your data. To wipe the data and start fresh, run `docker compose down -v`. Do this after pulling a change that renumbers or edits
an existing migration, otherwise Flyway refuses to start because the applied scripts no longer match.

## Code Style Guide

This extends the [root style guide](../README.md#code-style-guide). Rules here apply only within the API subfolder.

### Formatting

- Formatting is handled via IDE config, provided for IntelliJ and VS Code. Use the provided config rather than your
  own IDE defaults.
- Do not manually override automated formatting

### Documentation comments

- Javadoc comments are required for:
   - All classes, excluding:
     - Classes inherited from an interface/abstract class that already carries the comment.
     - MapStruct mappers and Panache repositories
   - All non-constructor methods, including private ones unless overriding a parent interface/abstract class method
     that already carries the comment.
- If overridden behaviour diverges meaningfully from the parent's documented contract, add comments for the child class.
- Javadoc should not be used in controllers. Rather, OpenAPI decorators should be used for class and method
  descriptions
- No other kinds of comments should be left in code. Write code that is readable with obvious names. PRs with comments
  will be rejected outright.

### Naming Conventions

- Casing should follow Java and Quarkus conventions.
- SQL commands should be UPPERCASE and names should be in `snake_case`.

### Type Safety

- `var` and `any`-equivalents are not allowed except in tests.

### Testing
- Tests live in a mirrored `tests/` tree
- Test cases should be named using this format: `<<methodName>>_<<conditionIfAny>>_<<result>>`,
  e.g. `getUsers_WhenUserIsNotAdmin_ReturnsForbidden`, `getUsers_ReturnsUsers`, etc.
- Every test, excluding integration tests, must include AAA comments (`// Arrange`, `// Act`, `// Assert`) marking
  each section, unless the section is empty.
- A test coverage of 80% must be maintained
