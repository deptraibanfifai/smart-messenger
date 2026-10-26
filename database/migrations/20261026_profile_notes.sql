-- For existing databases. Spring's ddl-auto=update also adds these columns.
ALTER TABLE users
    ADD COLUMN status_text VARCHAR(80) NULL,
    ADD COLUMN status_expires_at DATETIME NULL;
