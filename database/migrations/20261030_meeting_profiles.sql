-- Run only if spring.jpa.hibernate.ddl-auto=update is disabled. Back up the DB first.
CREATE TABLE IF NOT EXISTS meeting_profiles (
    user_id BIGINT PRIMARY KEY,
    bio VARCHAR(300),
    interests VARCHAR(300),
    opening_question VARCHAR(160),
    is_visible BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
