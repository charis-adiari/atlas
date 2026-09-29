# atlas-api

This project uses Java Quarkus.

## Table of Contents
1. [Environment Setup](#environment-setup)
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

This stops the container but preserves your data. To wipe the data and start fresh, run `docker compose down -v`

## Code Style Guide

This extends the [root style guide](../README.md#code-style-guide). Rules here apply only within the UI subfolder.

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
- If overridden behaviour diverges meaningfully from the parent's documented contract, add a brief note.
- Javadoc should not be used in controllers. Rather, OpenAPI decorators should be used for class and method 
  descriptions
- No other kinds of comments should be left in code. Write code that is readable with obvious names. PRs with comments 
  will be rejected outright.

### Code Size Limits

- **Methods:** maximum 60 lines. Approaching this is a sign to extract helper methods.
- **Classes:** ideally 100–300 lines. Classes over 500 lines will have their PR rejected outright.

### Naming Conventions

- Casing should follow Java and Quarkus conventions.
- **Constants:** always `SCREAMING_SNAKE_CASE`.
- **Booleans:** must start with a verb signalling yes/no - `is`, `has`, `can` (e.g. `isActive`, `hasPermission`). Do 
  not use bare names like `active`.
- SQL commands should be UPPERCASE and names should be in `snake_case`.
- Names should not encode which subfolder they live in (no `uiUserCard`, no `apiUserService`).

### Type Safety

- `var` and `any`-equivalents are not allowed except in tests.

### Miscellaneous

- **Folder size:** past 5 files, split a folder into subfolders by responsibility. On the other hand, 5 folders with 1 file each should be questioned.
- PRs should stay under 30 changed files. Anything over 50 is as a symptom of poor planning.

### Testing
- Tests live in a mirrored `tests/` tree
- Test cases should be named using this format: `<<methodName>>_<<conditionIfAny>>_<<result>>`, 
  e.g. `getUsers_WhenUserIsNotAdmin_ReturnsForbidden`, `getUsers_ReturnsUsers`, etc.
- Every test, excluding integration tests, must include AAA comments (`// Arrange`, `// Act`, `// Assert`) marking 
  each section, unless the section is empty.
- A test coverage of 80% must be maintained