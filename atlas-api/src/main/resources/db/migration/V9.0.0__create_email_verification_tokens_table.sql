-- V9.0.0: email verification tokens. One row is a pending link that proves a user owns their email address.

CREATE TABLE email_verification_tokens (
    id         uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid         NOT NULL,
    token_hash varchar(64)  NOT NULL,
    expires_at timestamptz  NOT NULL,
    created_at timestamptz  NOT NULL DEFAULT now(),

    CONSTRAINT uq_email_verification_tokens_token_hash UNIQUE (token_hash),
    CONSTRAINT fk_email_verification_tokens_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_email_verification_tokens_user_id ON email_verification_tokens (user_id);

-- rollback: DROP TABLE IF EXISTS email_verification_tokens;