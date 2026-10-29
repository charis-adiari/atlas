-- V4.0.0: folders. Folders nest through the nullable parent_folder_id (NULL = top level of the vault).

CREATE TABLE folders (
    id               uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    vault_id         uuid         NOT NULL,
    parent_folder_id uuid,
    name             varchar(255) NOT NULL,
    created_at       timestamptz  NOT NULL DEFAULT now(),
    last_updated_at  timestamptz  NOT NULL DEFAULT now(),

    CONSTRAINT uq_folders_id_vault UNIQUE (id, vault_id),
    CONSTRAINT fk_folders_vault FOREIGN KEY (vault_id) REFERENCES vaults (id) ON DELETE CASCADE,
    CONSTRAINT fk_folders_parent FOREIGN KEY (parent_folder_id, vault_id)
        REFERENCES folders (id, vault_id) ON DELETE CASCADE
        DEFERRABLE INITIALLY IMMEDIATE,
    CONSTRAINT ck_folders_not_own_parent CHECK (parent_folder_id IS NULL OR parent_folder_id <> id),
    CONSTRAINT ck_folders_name_not_blank CHECK (btrim(name) <> '')
);

CREATE INDEX idx_folders_vault_parent ON folders (vault_id, parent_folder_id);
CREATE INDEX idx_folders_parent ON folders (parent_folder_id);

-- rollback: DROP TABLE IF EXISTS folders;