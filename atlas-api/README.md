# atlas-api

This project uses Quarkus, the Supersonic Subatomic Java Framework. If you want to learn more about Quarkus, please 
visit its website: <https://quarkus.io/>.

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

### Documentation comments

- Javadoc comments are required for:
   - All classes, excluding:
     - Classes inherited from an interface/abstract class that already carries the comment.
     - MapStruct mappers and Panache repositories
   - All non-constructor methods, including private ones unless overriding a parent interface/abstract class method 
     that already carries the comment.
- If overridden behaviour diverges meaningfully from the parent's documented contract, add a brief note.
- No other kinds of comments should be left in code. Write code that is readable with obvious names. PRs with comments 
  will be rejected outright.