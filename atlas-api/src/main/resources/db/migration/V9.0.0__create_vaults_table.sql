-- V3.0.0: vaults. A vault belongs to exactly one user; a user can have many vaults.

CREATE TABLE vaults (
    id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid         NOT NULL,
    name            varchar(255) NOT NULL,
    created_at      timestamptz  NOT NULL DEFAULT now(),
    last_updated_at timestamptz  NOT NULL DEFAULT now(),

    CONSTRAINT fk_vaults_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT ck_vaults_name_not_blank CHECK (btrim(name) <> '')
);

CREATE INDEX idx_vaults_user_id ON vaults (user_id);

-- rollback: DROP TABLE IF EXISTS vaults;