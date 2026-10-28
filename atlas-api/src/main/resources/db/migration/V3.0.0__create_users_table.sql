-- V3.0.0: user accounts (US-02).

CREATE TABLE users (
    id                uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    email             varchar(320) NOT NULL,
    password_hash     text         NOT NULL,
    email_verified_at timestamptz,
    status_code       varchar(25)  NOT NULL DEFAULT 'PENDING',
    created_at        timestamptz  NOT NULL DEFAULT now(),
    last_updated_at   timestamptz  NOT NULL DEFAULT now(),

    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT fk_users_user_statuses FOREIGN KEY (status_code) REFERENCES user_statuses (code),
    CONSTRAINT ck_users_email_normalised CHECK (email <> '' AND email = lower(btrim(email)))
);

-- rollback: DROP TABLE IF EXISTS users;