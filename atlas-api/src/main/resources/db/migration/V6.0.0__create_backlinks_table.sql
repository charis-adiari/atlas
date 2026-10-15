-- V6.0.0: backlinks. One row means "source file links to target file".
--
-- Both composite foreign keys include vault_id, so a link can only join two files of the same
-- vault, and that vault is stored on the row. UNIQUE (source_file_id, target_file_id) keeps one row
-- per pair however many times the source mentions the target. The surrogate id only exists to make
-- the table easy to map as an entity; the pair is the real identity, so the migration endpoint can
-- insert with ON CONFLICT (source_file_id, target_file_id) DO NOTHING.
--
-- Links to files that do not exist yet (dangling links) are not stored here.
-- Deleting either file deletes the backlink.

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

-- "What links to this file?" The unique constraint above already covers lookups by source.
CREATE INDEX idx_backlinks_target ON backlinks (target_file_id);
-- Serves the vault_id cascade.
CREATE INDEX idx_backlinks_vault ON backlinks (vault_id);
