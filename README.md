# 🚀 SMART MESSENGER — SOURCE CODE TEMPLATE

> **Đồ án Cơ sở 4 — Sinh viên năm 3**  
> **Kiến trúc:** React.js (Frontend) + Java Spring Boot 3 (Backend) + MySQL + Google Gemini AI  
> **Giao thức:** WebSocket/STOMP over TCP + REST API

---

## 📂 CẤU TRÚC THƯ MỤC DỰ ÁN

```
smart-messenger/
├── backend/                      # Source code Backend Java Spring Boot
│   ├── pom.xml
│   └── src/main/java/com/smartmessenger/
│       ├── SmartMessengerApplication.java
│       ├── config/               # WebSocket STOMP & CORS Config
│       ├── controller/           # REST & WebSocket Controllers
│       ├── dto/                  # Request & Response Data Objects
│       ├── model/                # JPA Entities (User, Conversation, Message)
│       ├── repository/           # Spring Data JPA Repositories
│       ├── security/             # Spring Security + JWT Filters
│       └── service/              # Business Logic & Gemini AI Integration
│
├── frontend/                     # Source code Frontend React.js (Vite + Tailwind CSS)
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── src/
│       ├── components/           # UI Components (ChatWindow, Sidebar, ThemePicker, Modals)
│       ├── context/              # React Context (AuthContext, ChatContext)
│       ├── pages/                # Pages (ChatPage, LoginPage, RegisterPage, AdminPage)
│       └── services/             # Axios API & WebSocket STOMP Client
│
└── database/
    └── init.sql                  # Script tạo Database & Dữ liệu mẫu (Seed Data)
```

---

## 🛠️ HƯỚNG DẪN CÀI ĐẶT & CHẠY DỰ ÁN

### BƯỚC 1: KHỞI TẠO DATABASE (MySQL)
1. Mở **MySQL Workbench** hoặc **phpMyAdmin** (XAMPP).
2. Mở file [database/init.sql](file:///C:/Users/Asus/.gemini/antigravity/scratch/smart-messenger/database/init.sql) và chạy toàn bộ script.
3. Database `smart_messenger_db` sẽ được tạo kèm các tài khoản mẫu:
   * **Admin:** `admin` / `password123`
   * **Sinh viên 1:** `sinhvien1` / `password123`
   * **Sinh viên 2:** `sinhvien2` / `password123`

---

### BƯỚC 2: CHẠY BACKEND (Spring Boot)
1. Mở thư mục `backend/` bằng **IntelliJ IDEA** hoặc **VS Code**.
2. Mở file [application.properties](file:///C:/Users/Asus/.gemini/antigravity/scratch/smart-messenger/backend/src/main/resources/application.properties):
   * Kiểm tra `spring.datasource.username` và `password` MySQL của máy bạn (mặc định: `root` / `123456`).
   * (Tùy chọn) Điền API Key Gemini vào `app.gemini.api-key` (lấy miễn phí tại: https://aistudio.google.com/).
3. Chạy file `SmartMessengerApplication.java` hoặc dùng terminal:
   ```bash
   cd backend
   mvn spring-boot:run
   ```
4. Backend sẽ khởi động tại: `http://localhost:8080` (WebSocket endpoint: `ws://localhost:8080/ws`).

---

### BƯỚC 3: CHẠY FRONTEND (React)
1. Mở terminal tại thư mục `frontend/`:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
2. Truy cập ứng dụng tại: `http://localhost:5173`

---

## 🎯 KỊCH BẢN DEMO ĐỒ ÁN TRÊN MÁY TÍNH

1. **Test Chat Realtime 1-1:**
   * Mở 1 tab trình duyệt Chrome (thường): Đăng nhập `sinhvien1`.
   * Mở 1 tab trình duyệt Chrome (ẩn danh): Đăng nhập `sinhvien2`.
   * Cả 2 tài khoản nhắn tin cho nhau ➔ Tin nhắn hiển thị tức thời qua WebSocket, không cần reload!
   * Đổi màu bong bóng chat bằng nút **Palette (Đổi màu)** ➔ Màu sắc thay đổi theo thời gian thực.
2. **Test Chat Nhóm:**
   * Nhấn nút **Tạo nhóm**, đặt tên nhóm và tick chọn thành viên.
   * Tất cả thành viên trong nhóm nhận được tin nhắn realtime cùng lúc.
3. **Test Trí tuệ nhân tạo (AI):**
   * Nhấn nút **Hỏi Trợ lý AI** trên Navbar ➔ Chat trực tiếp với Google Gemini 1.5 Flash.
   * Nhấn nút **AI Tóm tắt** trong khung chat ➔ AI tự động đọc lịch sử tin nhắn và tóm tắt ý chính.
4. **Test Phân hệ Quản trị (Admin):**
   * Đăng nhập tài khoản `admin` / `password123`.
   * Nhấn vào nút **Quản trị Admin** trên Navbar.
   * Xem thống kê tổng quan (User, Online, Tin nhắn).
   * Thử bấm nút **Khóa tài khoản** một user ➔ User đó lập tức bị chặn.
