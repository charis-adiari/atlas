-- V9.0.0: email verification tokens. One row is a pending link that proves a user owns their email address.
--
-- Only the hash of the token is stored (token_hash), never the token itself, so a leaked copy of this table cannot
-- be used to verify anyone. The unique constraint on token_hash is what the lookup by link relies on.
--
-- A token is deleted when it is used and when a new one is issued for the same user, so a user normally has at most
-- one row. Expired rows are ignored by the application and removed with the user.
--
-- Deleting a user deletes their tokens.

CREATE TABLE email_verification_tokens (
    id         uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid         NOT NULL,
    token_hash varchar(64)  NOT NULL,
    expires_at timestamptz  NOT NULL,
    created_at timestamptz  NOT NULL DEFAULT now(),

    CONSTRAINT uq_email_verification_tokens_token_hash UNIQUE (token_hash),
    CONSTRAINT fk_email_verification_tokens_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Serves the user_id cascade and the removal of a user's earlier tokens.
CREATE INDEX idx_email_verification_tokens_user_id ON email_verification_tokens (user_id);
