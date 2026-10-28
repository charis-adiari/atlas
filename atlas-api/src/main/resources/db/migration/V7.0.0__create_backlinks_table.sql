-- V7.0.0: backlinks. One row means "source file links to target file".

CREATE TABLE backlinks (
    id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    vault_id       uuid        NOT NULL,
    source_file_id uuid        NOT NULL,
    target_file_id uuid        NOT NULL,
    created_at     timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT uq_backlinks_source_target UNIQUE (source_file_id, target_file_id),
    CONSTRAINT fk_backlinks_vault FOREIGN KEY (vault_id) REFERENCES vaults (id) ON DELETE CASCADE,
    CONSTRAINT fk_backlinks_source FOREIGN KEY (source_file_id, vault_id)
        REFERENCES files (id, vault_id) ON DELETE CASCADE,
    CONSTRAINT fk_backlinks_target FOREIGN KEY (target_file_id, vault_id)
        REFERENCES files (id, vault_id) ON DELETE CASCADE
);

CREATE INDEX idx_backlinks_target ON backlinks (target_file_id);
CREATE INDEX idx_backlinks_vault ON backlinks (vault_id);

-- rollback: DROP TABLE IF EXISTS backlinks;