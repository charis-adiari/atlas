-- V5.0.0: files. A file is either a Markdown note or a canvas.
--
-- folder_id is NULL for files at the top level of a vault. The composite foreign key
-- (folder_id, vault_id) guarantees the folder is in the same vault as the file; with folder_id
-- NULL the constraint is not checked (default MATCH SIMPLE), which is what we want.
--
-- content holds the Markdown text for a note and the serialised JSON for a canvas. If canvases
-- ever need to be queried inside the database, move them to a jsonb column in a later migration.
--
-- created_at / last_updated_at are NOT maintained by a trigger: migrated files keep the timestamps
-- they had locally, and the application sets last_updated_at when it saves.
--
-- Deleting a folder deletes the files in it.

CREATE TABLE files (
    id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    vault_id        uuid         NOT NULL,
    folder_id       uuid,
    type            varchar(20)  NOT NULL,
    name            varchar(255) NOT NULL,
    content         text         NOT NULL DEFAULT '',
    created_at      timestamptz  NOT NULL DEFAULT now(),
    last_updated_at timestamptz  NOT NULL DEFAULT now(),

    CONSTRAINT uq_files_id_vault UNIQUE (id, vault_id),
    CONSTRAINT fk_files_vault FOREIGN KEY (vault_id) REFERENCES vaults (id) ON DELETE CASCADE,
    CONSTRAINT fk_files_folder FOREIGN KEY (folder_id, vault_id)
        REFERENCES folders (id, vault_id) ON DELETE CASCADE,
    CONSTRAINT ck_files_type CHECK (type IN ('note', 'canvas')),
    CONSTRAINT ck_files_name_not_blank CHECK (btrim(name) <> '')
);

-- Lists a vault's files / a folder's files, and serves the vault_id cascade.
CREATE INDEX idx_files_vault_folder ON files (vault_id, folder_id);
-- Serves the folder_id cascade when a folder is deleted.
CREATE INDEX idx_files_folder ON files (folder_id);
