-- V5.0.0: file types. Every file (V6.0.0) has exactly one of these types.
--
-- The API mirrors these rows in its FileType enum, so a new type needs a new row here and a new constant there.
-- code is the stable identifier that files point at; description is the human-readable name.

CREATE TABLE file_types (
    code        varchar(25)  PRIMARY KEY,
    description varchar(255) NOT NULL
);

INSERT INTO file_types (code, description) VALUES
    ('NOTE', 'Note'),
    ('CANVAS', 'Canvas');

-- rollback: DROP TABLE IF EXISTS file_types;