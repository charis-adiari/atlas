-- V11.0.0: add user status to users

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS status_code varchar(25) NOT NULL DEFAULT 'PENDING';

UPDATE users
SET status_code = 'PENDING'
WHERE status_code IS DISTINCT FROM 'PENDING';

ALTER TABLE users
    ADD CONSTRAINT fk_users_user_statuses
        FOREIGN KEY (status_code) REFERENCES user_statuses (code);

-- rollback:
-- ALTER TABLE users
--     DROP CONSTRAINT IF EXISTS fk_users_user_statuses;
--
-- ALTER TABLE users
--     DROP COLUMN IF EXISTS status_code;