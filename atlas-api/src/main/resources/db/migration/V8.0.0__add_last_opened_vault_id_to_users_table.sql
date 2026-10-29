-- V8.0.0: remember which vault each user had open last.

ALTER TABLE users
    ADD COLUMN last_opened_vault_id uuid,
    ADD CONSTRAINT fk_users_last_opened_vault FOREIGN KEY (last_opened_vault_id)
        REFERENCES vaults (id) ON DELETE SET NULL;

CREATE INDEX idx_users_last_opened_vault_id ON users (last_opened_vault_id);

-- rollback: DROP INDEX IF EXISTS idx_users_last_opened_vault_id; ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_last_opened_vault, DROP COLUMN IF EXISTS last_opened_vault_id;