# Smart Messenger – cập nhật 6 mục

## Chạy thử

- Cần JDK 17, Maven, Node.js và MySQL. Chạy `mvn spring-boot:run` trong `backend` và `npm install && npm run dev` trong `frontend`.
- Thiết lập `DB_PASSWORD`, `JWT_SECRET` (chuỗi Base64 của ít nhất 32 byte ngẫu nhiên), `GEMINI_API_KEY` trước khi chạy backend. Có thể đặt `UPLOAD_DIR` để đổi chỗ lưu tệp, `GEMINI_API_URL` để đổi model/API endpoint.
- Nếu triển khai ngoài localhost, thiết lập `APP_WEBSOCKET_ALLOWED_ORIGINS` theo origin frontend. Cấu hình CORS HTTP tương ứng trong `CorsConfig`.
- Backend dùng Hibernate `ddl-auto=update` cho ba cột mới trong `messages`: `edited_at`, `read_at`, `deleted`. Sao lưu cơ sở dữ liệu trước khi chạy migration trên dữ liệu thật.
- Tệp được lưu trong thư mục `uploads` và chỉ thành viên cuộc trò chuyện lấy được qua JWT. Sao lưu thư mục này cùng database.

## Các API chính

- `GET /api/users/me`, `PUT /api/users/me`, `PUT /api/users/me/password`.
- `PUT /api/admin/users/{id}/status`: admin có thể khóa/mở khóa, không tự khóa mình.
- `GET /api/messages/search?conversationId=&keyword=`, `PUT|DELETE /api/messages/{id}`, `PUT /api/messages/read/{conversationId}`.
- `POST /api/files/{conversationId}` (multipart `file`, PNG/JPEG/WebP/PDF/TXT, tối đa 10 MB), `GET /api/files/{conversationId}/{fileId}`.
- `PUT /api/conversations/{id}/title`, `POST|DELETE /api/conversations/{id}/members/{memberId}`, `PUT /api/conversations/{id}/owner/{memberId}` (chỉ trưởng nhóm).
- WebSocket native `/ws-native`; STOMP `CONNECT` dùng header `Authorization: Bearer <JWT>`; đăng ký `/topic/conversation/{id}` được kiểm tra tư cách thành viên.

## Giới hạn hiện tại

- Trạng thái `readAt` biểu thị đã có một thành viên khác đọc; với nhóm nhiều người, hệ thống chưa lưu trạng thái riêng cho từng thành viên.
- Tệp đã tải lên không tự xóa khỏi ổ đĩa khi xóa tin nhắn; cần tác vụ dọn dẹp theo chính sách lưu trữ.
- Không có kết nối MySQL/Gemini trong môi trường chuẩn bị bản cập nhật này; cần kiểm tra tích hợp sau khi cấu hình.
