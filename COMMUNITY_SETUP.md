# Cộng đồng, kết bạn và bảng tin

Sau đăng nhập, tài khoản người dùng mở trang cộng đồng ở `/`; phần nhắn tin nằm ở `/chat`.
Admin tiếp tục vào `/admin`. Tài khoản, token, xác minh email và tin nhắn cũ được giữ nguyên.

Người dùng có thể gửi lời mời, chấp nhận, từ chối, hủy lời mời, hủy kết bạn, chặn và bỏ chặn.
Lời mời không tự tạo một cuộc chat. Chỉ trạng thái `ACCEPTED` mới cho tạo hoặc gửi
tin nhắn trong chat riêng. Lịch sử các đoạn chat cũ vẫn có thể xem, nhưng không gửi tiếp
cho đến khi hai người kết bạn. Group chat cũ vẫn hoạt động; quy tắc kết bạn hiện áp dụng
cho **chat riêng**, không áp dụng cho lời nhắn trong nhóm Messenger.

MySQL: `spring.jpa.hibernate.ddl-auto=update` hiện được bật nên backend sẽ tạo bảng
`friendships` khi khởi động. Nếu tắt chức năng này, chạy riêng
`database/migrations/20261029_friendships.sql` trên database đã sao lưu. Không chạy
lại toàn bộ `database/init.sql` lên database hiện có.

Thử bằng hai tài khoản:

1. Đăng nhập hai trình duyệt, mở `/` và gửi lời mời từ tài khoản A.
2. Trên trình duyệt B tải lại trang, chấp nhận. A tải lại trang để thấy trạng thái.
3. A hoặc B chọn **Nhắn tin**; Messenger mở đoạn chat và gửi tin nhắn như trước.
4. Hủy kết bạn: xem lại lịch sử được, nhưng gửi tin nhắn mới sẽ bị từ chối.

Giai đoạn tiếp theo đã có bảng tin chung: thành viên có thể đăng bài văn bản tối đa
2000 ký tự, thích, bình luận tối đa 500 ký tự, xóa bài của mình và xóa bình luận của
mình hoặc dưới bài của mình. Bảng tin có phân trang; các tài khoản chặn nhau không
nhìn thấy bài của nhau hoặc tương tác. Bình luận công khai trong nhóm không tạo
quan hệ bạn bè và không cấp quyền nhắn tin riêng.

Backend hiện bật `spring.jpa.hibernate.ddl-auto=update` nên khi khởi động sẽ tạo
`community_posts`, `community_comments` và `community_likes`. Nếu đã tắt update,
sao lưu cơ sở dữ liệu rồi chạy `database/migrations/20261030_community_feed.sql`
một lần. Không chạy lại `database/init.sql` trên dữ liệu hiện có.

Trình tự thử: đăng nhập tài khoản thường, vào `/`, viết bài; dùng trình duyệt thứ
hai đăng nhập tài khoản khác để xem, thích và bình luận. Kiểm tra rằng chỉ chủ bài
mới xóa được bài. Ảnh/video, hồ sơ hẹn hò riêng, lọc tìm kiếm nâng cao và kiểm
duyệt nội dung sẽ được triển khai ở giai đoạn khác.

Trang Khám phá nay có hồ sơ gặp gỡ tự chọn: người dùng viết giới thiệu, sở thích và
câu hỏi mở đầu, rồi bật “Hiển thị hồ sơ” để xuất hiện trên thẻ khám phá. Mặc định
hồ sơ ẩn, tài khoản cũ và admin không bị thay đổi. Tìm theo tên, username hoặc sở
thích được xử lý trên backend có phân trang. Hai tài khoản chặn nhau không xuất
hiện trong mục Khám phá của nhau. Email và số điện thoại không có trong DTO này.
Backend `ddl-auto=update` tạo bảng `meeting_profiles`; nếu tắt, dùng riêng
`database/migrations/20261030_meeting_profiles.sql` một lần sau khi sao lưu.
