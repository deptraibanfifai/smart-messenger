# Thiết lập đăng nhập và đăng ký

## Tài khoản cũ

`admin`, `sinhvien1`, `sinhvien2` cùng các tài khoản hiện có giữ nguyên mật khẩu, vai trò và dữ liệu. Họ tiếp tục đăng nhập bằng username. Cột email của họ để `NULL`; không cần điền email hoặc số điện thoại.

## Tài khoản mới

Đăng ký bằng tên hiển thị, username, email và mật khẩu. Server gửi mã sáu số đến email; tài khoản chỉ được tạo sau khi nhập đúng mã trong 10 phút. Mã mới chỉ gửi được sau 1 phút; tối đa 5 lần nhập sai mỗi mã. Sau xác minh, người dùng đăng nhập tự động. Đăng nhập thông thường chấp nhận username hoặc email.

Google Identity Services hiện nút trên cả `/login` và `/register`. Nhấn nút, chọn tài khoản Google đã xác minh email, backend kiểm tra chữ ký Google, thời hạn, issuer, audience, rồi tạo tài khoản quyền `ROLE_USER` và đăng nhập ngay. Nếu email Google đã thuộc một tài khoản đăng ký bằng mật khẩu thì hệ thống báo rõ, không tự liên kết tài khoản. Admin chỉ vào `/admin`.

## Cấu hình cần có

1. Trong Google Cloud Console, tạo **OAuth client ID** loại **Web application**. Thêm origin của frontend vào **Authorized JavaScript origins**, ví dụ `http://localhost:5173` (đúng cổng Vite đang dùng). Không cần client secret cho luồng này.
2. Tạo `frontend/.env.local` theo `frontend/.env.example`, điền `VITE_GOOGLE_CLIENT_ID`. Trong cấu hình chạy backend đặt `GOOGLE_CLIENT_ID` cùng giá trị đó. Khởi động lại Vite sau khi sửa env.
3. Đặt biến môi trường backend `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `MAIL_FROM` (địa chỉ người gửi). Với nhà cung cấp mail khác cổng 587/STARTTLS, chỉnh `spring.mail.*` trong `application.properties`. Không commit mật khẩu SMTP.
4. Giữ `JWT_SECRET` đang dùng. Backend vẫn dùng JWT cho phiên đăng nhập nội bộ và WebSocket, kể cả khi người dùng vào bằng Google.
5. Database cũ được Hibernate `ddl-auto=update` thêm các cột `users.email`, `users.google_sub` và bảng `pending_registrations`; sao lưu database trước lần khởi động đầu. File `database/init.sql` đã có schema cho cài đặt mới. Không chạy lại các câu `INSERT` mẫu nếu không cần.

## Ảnh nền

Ảnh mặc định nằm ở `frontend/public/images/auth-background.svg`. Để dùng ảnh của bạn, chép JPG/PNG vào `frontend/public/images/` rồi sửa `url('/images/auth-background.svg')` trong `frontend/src/pages/AuthGlass.css` thành tên tệp của bạn. Giao diện vẫn dùng nền sáng và kính mờ.
