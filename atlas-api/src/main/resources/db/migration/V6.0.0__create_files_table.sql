-- V6.0.0: files. A file is one of the types listed in file_types (V5.0.0), such as a Markdown note or a canvas.

CREATE TABLE files (
    id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    vault_id        uuid         NOT NULL,
    folder_id       uuid,
    file_type_code  varchar(25)  NOT NULL,
    name            varchar(255) NOT NULL,
    content         text         NOT NULL DEFAULT '',
    created_at      timestamptz  NOT NULL DEFAULT now(),
    last_updated_at timestamptz  NOT NULL DEFAULT now(),

    CONSTRAINT uq_files_id_vault UNIQUE (id, vault_id),
    CONSTRAINT fk_files_vault FOREIGN KEY (vault_id) REFERENCES vaults (id) ON DELETE CASCADE,
    CONSTRAINT fk_files_folder FOREIGN KEY (folder_id, vault_id)
        REFERENCES folders (id, vault_id) ON DELETE CASCADE,
    CONSTRAINT fk_files_file_type FOREIGN KEY (file_type_code) REFERENCES file_types (code),
    CONSTRAINT ck_files_name_not_blank CHECK (btrim(name) <> '')
);

CREATE INDEX idx_files_vault_folder ON files (vault_id, folder_id);
CREATE INDEX idx_files_folder ON files (folder_id);

-- rollback: DROP TABLE IF EXISTS files;