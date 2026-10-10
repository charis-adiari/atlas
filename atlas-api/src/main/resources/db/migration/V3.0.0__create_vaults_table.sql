-- V3.0.0: vaults. A vault belongs to exactly one user; a user can have many vaults.
--
-- id is client-generated on purpose (see V4.0.0-V6.0.0 and the migration endpoint): local vaults keep the
-- UUID they already have when they are uploaded. DEFAULT gen_random_uuid() only applies to rows the
-- server creates itself.
--
-- Deleting a user deletes their vaults (account deletion), which cascades to everything below.
-- (V7.0.0 later adds users.last_opened_vault_id, the reverse pointer from a user to one of these vaults.)

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
