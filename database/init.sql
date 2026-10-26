-- ====================================================================
-- SMART MESSENGER DATABASE SCHEMA (MySQL 8.x)
-- ====================================================================

CREATE DATABASE IF NOT EXISTS smart_messenger_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE smart_messenger_db;

-- 1. BẢNG USERS (Người dùng & Phân quyền)
CREATE TABLE IF NOT EXISTS users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(254) UNIQUE NULL,
    google_sub VARCHAR(255) UNIQUE NULL,
    password VARCHAR(255) NOT NULL, -- BCrypt hashed
    full_name VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(500) DEFAULT 'https://api.dicebear.com/7.x/bottts/svg?seed=messenger',
    status_text VARCHAR(80) NULL,
    status_expires_at DATETIME NULL,
    role ENUM('ROLE_USER', 'ROLE_ADMIN') DEFAULT 'ROLE_USER',
    status ENUM('ACTIVE', 'BANNED') DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Mã xác minh email; ba tài khoản mẫu không bị thay đổi.
CREATE TABLE IF NOT EXISTS pending_registrations (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(254) UNIQUE NOT NULL,
    username VARCHAR(50) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    code_hash VARCHAR(255) NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    sent_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL
);

-- 2. BẢNG CONVERSATIONS (Cuộc trò chuyện 1-1 hoặc Nhóm)
CREATE TABLE IF NOT EXISTS conversations (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    type ENUM('DIRECT', 'GROUP') NOT NULL,
    title VARCHAR(100),                         -- Tên nhóm (NULL đối với chat 1-1)
    theme_color VARCHAR(20) DEFAULT '#0284c7',  -- Một mã HEX hoặc hai mã HEX phân tách bằng dấu phẩy
    created_by BIGINT,                          -- User ID người tạo
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 3. BẢNG CONVERSATION_MEMBERS (Thành viên tham gia)
CREATE TABLE IF NOT EXISTS conversation_members (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    conversation_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    role ENUM('OWNER', 'ADMIN', 'MEMBER') DEFAULT 'MEMBER',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_read_at TIMESTAMP NULL,
    nickname VARCHAR(60) NULL,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uk_conv_member (conversation_id, user_id)
);

-- 4. BẢNG MESSAGES (Tin nhắn)
CREATE TABLE IF NOT EXISTS messages (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    conversation_id BIGINT NOT NULL,
    sender_id BIGINT,
    -- NULL nếu là AI hoặc Thông báo hệ thống
    content TEXT NOT NULL,
    message_type ENUM('TEXT', 'SYSTEM', 'AI', 'IMAGE', 'FILE') DEFAULT 'TEXT',
    reply_to_id BIGINT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (reply_to_id) REFERENCES messages(id) ON DELETE SET NULL,
    INDEX idx_conv_time (conversation_id, created_at)
);

CREATE TABLE IF NOT EXISTS message_reactions (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    message_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    emoji VARCHAR(12) NOT NULL,
    UNIQUE KEY uk_message_reaction (message_id, user_id),
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);



-- ====================================================================
-- DỮ LIỆU MẪU BAN ĐẦU (SEED DATA)
-- Mật khẩu mặc định của tất cả tài khoản mẫu là: password123
-- BCrypt hash của 'password123': $2a$10$eACCYoNOHEqgkml8rk3Cvu.n/9r2R3B8ZgKkVzQx30j7u60mU7jZ2
-- ====================================================================

-- Thêm 1 Admin và 2 User mẫu
INSERT INTO users (id, username, password, full_name, avatar_url, role, status) VALUES
(1, 'admin', '$2a$10$eACCYoNOHEqgkml8rk3Cvu.n/9r2R3B8ZgKkVzQx30j7u60mU7jZ2', 'Administrator', 'https://api.dicebear.com/7.x/bottts/svg?seed=admin', 'ROLE_ADMIN', 'ACTIVE'),
(2, 'sinhvien1', '$2a$10$eACCYoNOHEqgkml8rk3Cvu.n/9r2R3B8ZgKkVzQx30j7u60mU7jZ2', 'Nguyễn Văn A (Dev 1)', 'https://api.dicebear.com/7.x/avataaars/svg?seed=sinhvien1', 'ROLE_USER', 'ACTIVE'),
(3, 'sinhvien2', '$2a$10$eACCYoNOHEqgkml8rk3Cvu.n/9r2R3B8ZgKkVzQx30j7u60mU7jZ2', 'Trần Thị B (Dev 2)', 'https://api.dicebear.com/7.x/avataaars/svg?seed=sinhvien2', 'ROLE_USER', 'ACTIVE')
ON DUPLICATE KEY UPDATE id=id;

-- Thêm 1 phòng chat 1-1 giữa SV1 và SV2
INSERT INTO conversations (id, type, title, theme_color, created_by) VALUES
(1, 'DIRECT', NULL, '#0284c7', 2)
ON DUPLICATE KEY UPDATE id=id;

INSERT INTO conversation_members (conversation_id, user_id, role) VALUES
(1, 2, 'MEMBER'),
(1, 3, 'MEMBER')
ON DUPLICATE KEY UPDATE id=id;

-- Thêm tin nhắn chào mừng
INSERT INTO messages (conversation_id, sender_id, content, message_type) VALUES
(1, 2, 'Chào bạn! Hệ thống Smart Messenger đã kết nối thành công.', 'TEXT'),
(1, 3, 'Tuyệt vời! Chúng ta có thể chat realtime qua WebSocket và gọi AI rồi.', 'TEXT')
ON DUPLICATE KEY UPDATE id=id;
