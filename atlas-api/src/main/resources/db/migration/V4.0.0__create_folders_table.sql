-- V4.0.0: folders. Folders nest through the nullable parent_folder_id (NULL = top level of the vault).
--
-- UNIQUE (id, vault_id) looks redundant next to the primary key, but it lets child tables use a
-- composite foreign key (x_id, vault_id). That makes the database itself refuse a parent folder,
-- file or backlink that lives in a different vault than the row pointing at it.
--
-- The parent foreign key is DEFERRABLE INITIALLY IMMEDIATE: normal inserts are checked straight
-- away, but the migration endpoint can run SET CONSTRAINTS fk_folders_parent DEFERRED and insert
-- the uploaded folders in any order instead of sorting parents before children.
--
-- Deleting a folder deletes its sub-folders and files (see V5.0.0), like deleting a directory.
-- A direct self-parent is rejected here; longer cycles (A -> B -> A) must be prevented by the
-- application when it moves a folder.

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

-- Lists a folder's children, and serves the vault_id cascade.
CREATE INDEX idx_folders_vault_parent ON folders (vault_id, parent_folder_id);
-- Serves the parent_folder_id cascade when a folder is deleted.
CREATE INDEX idx_folders_parent ON folders (parent_folder_id);
