-- Creates the roles table.

CREATE TABLE roles (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at  TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT uq_roles_name UNIQUE (name)
);

-- rollback: DROP TABLE IF EXISTS roles;