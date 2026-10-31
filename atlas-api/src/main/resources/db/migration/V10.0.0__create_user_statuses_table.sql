-- V10.0.0: creates the user status table

CREATE TABLE user_statuses (
    code        VARCHAR(25)  PRIMARY KEY,
    description VARCHAR(255) NOT NULL
);

INSERT INTO user_statuses (code, description) VALUES
    ('PENDING', 'Pending'),
    ('ACTIVE', 'Active');

-- rollback: DROP TABLE IF EXISTS user_statuses;