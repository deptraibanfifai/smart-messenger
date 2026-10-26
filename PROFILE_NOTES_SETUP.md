# Hồ sơ, trạng thái cá nhân và thông báo đang nhập

Bản cập nhật này bổ sung vào giao diện Direct hiện tại.

## Áp dụng

1. Kiểm tra và áp dụng bản vá từ thư mục gốc dự án bằng `git apply --check`, rồi `git apply`.
2. Dừng và chạy lại backend; chạy lại frontend.
3. Với cấu hình hiện tại `spring.jpa.hibernate.ddl-auto=update`, Hibernate tự thêm `users.status_text` và `users.status_expires_at`. Không chạy lại `database/init.sql` trên dữ liệu đang dùng. Chỉ sử dụng migration `database/migrations/20261026_profile_notes.sql` nếu bạn quản lý schema bằng SQL và hai cột chưa tồn tại.

## Cách sử dụng

- Avatar của bạn ở hàng ghi chú phía trên danh sách chat: đăng/sửa/xóa trạng thái chữ tối đa 80 ký tự, hiển thị cho người dùng trong ứng dụng và tự hết hạn sau 24 giờ. Ảnh/video cho trạng thái chưa có trong bản này.
- Avatar của bạn ở góc dưới trái: mở Hồ sơ của tôi, chọn ảnh PNG/JPEG trên máy, xem trước và Lưu hồ sơ. Đổi mật khẩu có nút riêng.
- Avatar người đang chat ở tiêu đề: xem hồ sơ của người đó. Không chỉnh thông tin tài khoản người khác.
- Avatar mới được kiểm tra nội dung ảnh ở backend, cắt vuông ở giữa thành 512×512 và lưu trong `<app.upload-dir>/avatars`. Tối đa 20 MB và 20 triệu điểm ảnh. Ảnh hồ sơ được phục vụ qua URL `/api/avatars/{id}` để các máy khác hiển thị được, không lưu đường dẫn ổ đĩa người tải.
- Nút tìm kiếm chỉ còn trong bảng thông tin ⓘ.
- Khi nhập chữ, người còn lại thấy tên và ba chấm động phía trên ô soạn tin. Trạng thái tự tắt khi ngừng gõ, xóa chữ, rời ô nhập, gửi tin hoặc chuyển cuộc trò chuyện.

## Kiểm tra trên hai trình duyệt

1. Đăng nhập hai tài khoản khác nhau, cùng mở một đoạn chat trực tiếp.
2. A nhập liên tục, B phải thấy “A đang nhập...”. A ngừng gõ: trạng thái biến mất sau khoảng 2,2 giây (tối đa khoảng 4,5 giây nếu gói dừng bị mất).
3. A đổi tên/ảnh: B phải thấy cập nhật trên tiêu đề và danh sách chat mà không tải lại.
4. A chia sẻ ghi chú: B phải thấy ghi chú ở dãy avatar. Thử sửa và xóa.
5. Mở hồ sơ, thu nhỏ cửa sổ: hộp hồ sơ vẫn ở giữa và cuộn được; Escape đóng hộp.

## Kiểm thử tự động

Frontend, tại `frontend`:

```powershell
npm test
npm run build
```

Backend, tại `backend`, dùng JDK 17 và Maven:

```powershell
mvn test
```

Đã kiểm tra 12 bài backend, 5 bài frontend và build frontend. Kiểm tra giao diện trên hai phiên Chromium dùng API/WebSocket mô phỏng; cần thử lại với backend/MySQL thật trên máy triển khai. Test Mockito sử dụng subclass mock maker để không yêu cầu JVM tự gắn Java agent. Nếu dùng Java 24 và gặp lỗi Byte Buddy, chuyển JDK chạy Maven/test sang 17 theo pom.xml.
