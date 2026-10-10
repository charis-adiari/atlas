-- V2.0.0: user accounts (US-02).
--
-- email is stored normalised (trimmed + lower-case) by the application. The CHECK makes the
-- database enforce that, so the plain UNIQUE constraint is effectively case-insensitive and two
-- simultaneous signups with the same address cannot both succeed.
--
-- email_verified_at is NULL until the user confirms their address (optional step in US-02).
--
-- users.last_opened_vault_id is added later, in V7.0.0: it points at vaults, which does not exist yet.

CREATE TABLE users (
    id                uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    email             varchar(320) NOT NULL,
    password_hash     text         NOT NULL,
    email_verified_at timestamptz,
    created_at        timestamptz  NOT NULL DEFAULT now(),
    last_updated_at   timestamptz  NOT NULL DEFAULT now(),

    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT ck_users_email_normalised CHECK (email <> '' AND email = lower(btrim(email)))
);
