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
mvn quarkus:dev
```

In IntelliJ, you can add a reusable run configuration:
- Create a maven configuration named `atlas-api`
- For the run script, enter `quarkus:dev`

Once the app is running, you can access the Swagger UI at <localhost:8080/q/swagger-ui>.
> **_NOTE:_**  Quarkus also now ships with a Dev UI, which is available in dev mode only at <http://localhost:8080/q/dev/>.

### Stopping the database

```bash
docker compose down
```

This stops the container but preserves your data. To wipe the data and start fresh, run `docker compose down -v`

## Related Guides

- REST ([guide](https://quarkus.io/guides/rest)): Build RESTful web services and APIs using Jakarta REST (formerly JAX-RS)
- Flyway ([guide](https://quarkus.io/guides/flyway)): Handle your database schema migrations
- Http Problem ([guide](https://github.com/quarkiverse/quarkus-http-problem/blob/main/README.md)): Problem Details for HTTP APIs (RFC-7807) implementation for Quarkus / RESTeasy.
- SmallRye OpenAPI ([guide](https://quarkus.io/guides/openapi-swaggerui)): Generate OpenAPI schemas and serve Swagger UI for REST API documentation
- REST Jackson ([guide](https://quarkus.io/guides/rest#json-serialisation)): Jackson serialization support for Quarkus REST. This extension is not compatible with the quarkus-resteasy extension, or any of the extensions that depend on it
- YAML Configuration ([guide](https://quarkus.io/guides/config-yaml)): Use YAML to configure your Quarkus application
- Hibernate ORM with Panache ([guide](https://quarkus.io/guides/hibernate-orm-panache)): Simplified JPA/Hibernate data access layer with active record and repository patterns
- JDBC Driver - PostgreSQL ([guide](https://quarkus.io/guides/datasource)): Connect to the PostgreSQL database via JDBC

## Provided Code

### YAML Config

Configure your application with YAML

[Related guide section...](https://quarkus.io/guides/config-reference#configuration-examples)

The Quarkus application configuration is located in `src/main/resources/application.yml`.

### Hibernate ORM

Create your first JPA entity

[Related guide section...](https://quarkus.io/guides/hibernate-orm)


[Related Hibernate with Panache section...](https://quarkus.io/guides/hibernate-orm-panache)


### REST

Easily start your REST Web Services

[Related guide section...](https://quarkus.io/guides/getting-started-reactive#reactive-jax-rs-resources)
