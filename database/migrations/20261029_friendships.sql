-- Chạy một lần nếu backend không bật spring.jpa.hibernate.ddl-auto=update.
-- Không sửa users, conversations hoặc messages đang có.
USE smart_messenger_db;

CREATE TABLE IF NOT EXISTS friendships (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_low_id BIGINT NOT NULL,
    user_high_id BIGINT NOT NULL,
    initiated_by_id BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    CONSTRAINT uq_friendship_pair UNIQUE (user_low_id, user_high_id),
    FOREIGN KEY (user_low_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (user_high_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (initiated_by_id) REFERENCES users(id) ON DELETE CASCADE
);
