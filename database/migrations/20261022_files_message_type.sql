-- Chạy một lần trên database cũ trước khi thử gửi ảnh/tệp.
USE smart_messenger_db;
ALTER TABLE messages
    MODIFY COLUMN message_type ENUM('TEXT', 'SYSTEM', 'AI', 'IMAGE', 'FILE') DEFAULT 'TEXT';
