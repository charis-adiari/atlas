-- V7.0.0: remember which vault each user had open last.
--
-- This is its own migration because users (V2.0.0) is created before vaults (V3.0.0), so the foreign key
-- cannot exist until both tables do. The two tables now point at each other: vaults.user_id is the
-- owner of a vault, users.last_opened_vault_id is the vault to reopen for that user.
--
-- NULL means "no vault opened yet" (a brand-new account). If that vault is deleted the column goes
-- back to NULL and the user stays. Deleting a user still deletes their vaults (V3.0.0's cascade).
--
-- The foreign key only proves the vault exists, not that it belongs to this user. The code that
-- sets this column must only ever use one of the user's own vaults.

ALTER TABLE users
    ADD COLUMN last_opened_vault_id uuid,
    ADD CONSTRAINT fk_users_last_opened_vault FOREIGN KEY (last_opened_vault_id)
        REFERENCES vaults (id) ON DELETE SET NULL;

-- Serves the SET NULL when a vault is deleted (otherwise Postgres scans users).
CREATE INDEX idx_users_last_opened_vault_id ON users (last_opened_vault_id);
