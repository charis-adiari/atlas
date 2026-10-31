-- V12.0.0: email verification codes. One row is a pending code that proves a user owns their email address.

CREATE TABLE email_verification_codes (
    id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID           NOT NULL,
    code_hash       BYTEA          NOT NULL,
    expires_at      TIMESTAMPZ     NOT NULL,
    attempts        SMALLINT       NOT NULL DEFAULT 0,
    resend_count    SMALLINT       NOT NULL DEFAULT 0,
    last_sent_at    TIMESTAMPZ     NOT NULL DEFAULT now(),
    created_at      TIMESTAMPZ     NOT NULL DEFAULT now(),

    CONSTRAINT uq_email_verification_codes_user UNIQUE (user_id),
    CONSTRAINT fk_email_verification_codes_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT chk_email_verification_codes_attempts CHECK (attempts BETWEEN 0 AND 5),
    CONSTRAINT chk_email_verification_codes_resend_count_nonnegative CHECK (resend_count >= 0),
    CONSTRAINT chk_email_verification_codes_hash_length CHECK (octet_length(code_hash) = 32)
);

DROP TABLE IF EXISTS email_verification_tokens;

-- rollback:
-- DROP TABLE IF EXISTS email_verification_codes;

-- CREATE TABLE email_verification_tokens (
--     id         uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
--     user_id    uuid         NOT NULL,
--     token_hash varchar(64)  NOT NULL,
--     expires_at timestamptz  NOT NULL,
--     created_at timestamptz  NOT NULL DEFAULT now(),
--
--     CONSTRAINT uq_email_verification_tokens_token_hash UNIQUE (token_hash),
--     CONSTRAINT fk_email_verification_tokens_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
-- );
--
-- CREATE INDEX idx_email_verification_tokens_user_id ON email_verification_tokens (user_id);
