# Smart Messenger — cài đặt và chạy trên Ubuntu

Hướng dẫn cho nhóm triển khai mã nguồn tại <https://github.com/deptraibanfifai/smart-messenger> trên **Ubuntu 26.04**. Ứng dụng gồm React/Vite, Java Spring Boot, MySQL trong Docker và Nginx. Các lệnh bên dưới chạy trên **máy Ubuntu của bạn**, không phải trong cửa sổ MySQL, trừ khi có ghi `mysql>`.

## 1. Kiến trúc và phiên bản

| Thành phần | Phiên bản dùng trong lần triển khai | Vai trò |
| --- | --- | --- |
| Ubuntu | 26.04 | Hệ điều hành |
| JDK | 17 | Biên dịch và chạy backend; `pom.xml` đặt `java.version=17` |
| Spring Boot | 3.2.4 | Backend, cổng 8080 |
| Maven | Bản do `apt` cung cấp | Tải thư viện và chạy/build Java |
| Node.js / npm | 22.22.1 / 9.2.0 | Cài thư viện và build frontend |
| Vite | 5.x theo `package.json` | Máy chủ phát triển ở cổng 5173 |
| Docker Engine | 29.9.1 đã kiểm thử | Chạy MySQL |
| MySQL | Image `mysql:8.4` | Database, chỉ mở tại `127.0.0.1:3306` |
| Nginx | 1.28.3 (Ubuntu) đã kiểm thử | Web server cổng 80, proxy API/WebSocket |

Luồng khi triển khai: trình duyệt → Nginx `:80` → file React đã build; `/api/` và `/ws-native` → Spring Boot `:8080` → MySQL `:3306`. Truy cập `http://localhost`, không cần để `npm run dev` chạy khi dùng Nginx.

## 2. Chuẩn bị môi trường

Mở terminal Ubuntu. Cài công cụ còn thiếu; nếu một gói đã cài, `apt` sẽ bỏ qua:

```bash
sudo apt update
sudo apt install git openjdk-17-jdk maven nodejs npm nginx docker.io openssl
```

Nếu Docker được cài bằng cách khác rồi, không cần cài lại `docker.io`. Kiểm tra:

```bash
java -version
mvn -version
node -v
npm -v
sudo docker --version
nginx -v
```

Kết quả mong đợi: Java 17, Node 22.x, npm 9.x, Docker hoạt động. Nếu `java -version` cho ra bản khác, chọn **JDK 17** trong IntelliJ hoặc chỉnh Java mặc định của máy. Nếu Docker chưa chạy:

```bash
sudo systemctl enable --now docker
sudo docker info
```

Nên dùng `sudo docker ...` trong hướng dẫn này để không phải chỉnh quyền nhóm Docker.

## 3. Lấy mã nguồn

```bash
cd ~
git clone https://github.com/deptraibanfifai/smart-messenger.git
cd ~/smart-messenger
ls backend frontend database
```

Nếu đã clone trước đó, dùng thư mục `~/smart-messenger` hiện có; không clone lồng thêm một bản. File `database/init.sql` **đã tạo bảng và thêm 3 tài khoản, 2 tin nhắn mẫu**; không cần tự tạo bảng. Nếu chép mã nguồn từ Windows sang Ubuntu, container và volume MySQL vẫn độc lập với thư mục dự án. Tuy nhiên, cần cài lại `node_modules` trên Ubuntu, build lại frontend cho Nginx và kiểm tra cấu hình chạy IntelliJ; các tệp trong `backend/uploads` có thể mất nếu chép đè thư mục đó.

## 4. MySQL trong Docker

Chạy khi **chưa có** container `smart-messenger-mysql`. Lệnh `read` cho phép đặt mật khẩu mà không ghi mật khẩu trực tiếp vào lịch sử shell:

```bash
read -rsp 'Dat mat khau MySQL root: ' SMART_MYSQL_ROOT_PASSWORD
echo
sudo docker run -d \
  --name smart-messenger-mysql \
  --restart unless-stopped \
  -p 127.0.0.1:3306:3306 \
  -e MYSQL_ROOT_PASSWORD="$SMART_MYSQL_ROOT_PASSWORD" \
  -v smart_messenger_mysql_data:/var/lib/mysql \
  -v "$HOME/smart-messenger/database/init.sql:/docker-entrypoint-initdb.d/01-init.sql:ro" \
  mysql:8.4
unset SMART_MYSQL_ROOT_PASSWORD
```

MySQL có thể cần vài chục giây để khởi tạo lần đầu. Kiểm tra:

```bash
sudo docker ps --filter name=smart-messenger-mysql
sudo docker logs --tail 30 smart-messenger-mysql
sudo docker exec -it smart-messenger-mysql mysql -u root -p -e "SELECT COUNT(*) AS user_count FROM smart_messenger_db.users;"
```

Nhập mật khẩu MySQL đã đặt. `user_count` dự kiến là **3**. Image chỉ chạy `init.sql` khi volume database còn rỗng. Với container đã tạo từ trước, dùng `sudo docker start smart-messenger-mysql`; **không xóa volume** để sửa lỗi đăng nhập, vì xóa volume sẽ mất dữ liệu.

### Sửa tài khoản mẫu và tiếng Việt cho bản mã nguồn hiện tại

Trong bản mã nguồn đã kiểm tra, chú thích SQL ghi mật khẩu `password123` nhưng hash BCrypt có sẵn không khớp. Một số lần nạp SQL còn làm sai dấu tiếng Việt. Với database demo mới tạo, vào MySQL:

```bash
sudo docker exec -it smart-messenger-mysql mysql --default-character-set=utf8mb4 -u root -p smart_messenger_db
```

Tại dấu nhắc `mysql>`, dán các lệnh **một lần**. Các giá trị hex là byte UTF-8 nên tránh lỗi terminal làm mất dấu; chỉ sửa đúng 3 tài khoản và 2 tin nhắn mẫu:

```sql
UPDATE users
SET password = '$2a$10$uoKi7EqO5l6050v8DrOyE.0C9msVT583FZ1zXKE2NjuSwMhmhRdia'
WHERE username IN ('admin', 'sinhvien1', 'sinhvien2');

UPDATE users SET full_name = CONVERT(0x4E677579E1BB856E2056C4836E20412028446576203129 USING utf8mb4)
WHERE username = 'sinhvien1';
UPDATE users SET full_name = CONVERT(0x5472E1BAA76E205468E1BB8B20422028446576203229 USING utf8mb4)
WHERE username = 'sinhvien2';

UPDATE messages SET content = CONVERT(0x4368C3A06F2062E1BAA16E212048E1BB87207468E1BB916E6720536D617274204D657373656E67657220C491C3A3206BE1BABF74206EE1BB9169207468C3A06E682063C3B46E672E USING utf8mb4)
WHERE id = 1;
UPDATE messages SET content = CONVERT(0x547579E1BB87742076E1BB9D6921204368C3BA6E672074612063C3B3207468E1BB832063686174207265616C74696D652071756120576562536F636B65742076C3A02067E1BB8D692041492072E1BB93692E USING utf8mb4)
WHERE id = 2;

SELECT username, HEX(full_name) FROM users WHERE username = 'sinhvien1';
exit;
```

Giá trị hex của `sinhvien1` phải bắt đầu bằng `4E677579E1BB85`. Tài khoản demo sau khi sửa: `admin`, `sinhvien1`, `sinhvien2`; cùng mật khẩu `password123`. Chỉ dùng mật khẩu mẫu trong môi trường demo nội bộ.

### Cập nhật database cũ để gửi ảnh và tệp

Với database đã tạo trước khi tính năng gửi ảnh/tệp được thêm vào mã nguồn, `init.sql` không tự chạy lại trên volume đã có dữ liệu. Vào MySQL bằng lệnh ở trên rồi kiểm tra:

```sql
SHOW COLUMNS FROM messages LIKE 'message_type';
```

Nếu `Type` chỉ có `TEXT`, `SYSTEM`, `AI`, chạy **một lần**:

```sql
ALTER TABLE messages
MODIFY COLUMN message_type ENUM('TEXT', 'SYSTEM', 'AI', 'IMAGE', 'FILE')
DEFAULT 'TEXT';
SHOW COLUMNS FROM messages LIKE 'message_type';
EXIT;
```

Sau đó phải thấy cả `IMAGE` và `FILE`; có thể thử gửi ảnh lại. Không nạp lại `init.sql` hoặc xóa volume. Bản SQL tương ứng nằm trong `database/migrations/20261022_files_message_type.sql`.

## 5. Backend Spring Boot

**Cách A: chạy trong IntelliJ IDEA**

1. Mở thư mục `~/smart-messenger/backend` như một dự án Maven, đợi Maven tải dependencies.
2. Vào **File → Project Structure → Project SDK**, chọn **JDK 17**.
3. Mở `src/main/java/com/smartmessenger/SmartMessengerApplication.java` và chạy class `com.smartmessenger.SmartMessengerApplication`.
4. Trong **Run → Edit Configurations → Environment variables**, đặt:
   - `SPRING_DATASOURCE_PASSWORD`: mật khẩu root MySQL đã đặt ở bước 4.
   - `JWT_SECRET`: tạo bằng `openssl rand -base64 32` và dán giá trị vào đây. Giữ nguyên khóa này khi khởi động lại để token đang dùng không bị vô hiệu.
   - `GEMINI_API_KEY`: API key Google AI Studio nếu dùng trợ lý AI; không cần cho chat thông thường.
5. Nhấn **OK** để lưu cửa sổ Environment Variables và **OK** lần nữa để lưu Run Configuration. **Stop** backend cũ rồi **Run** lại; biến môi trường thêm sau khi ứng dụng khởi động sẽ không tự động vào tiến trình Java đang chạy. Đợi log báo Spring Boot khởi động ở cổng `8080`. Giữ IntelliJ/backend đang chạy khi demo.

**Cách B: chạy bằng terminal**, trong terminal mới:

```bash
cd ~/smart-messenger/backend
read -rsp 'Nhap mat khau MySQL root: ' SPRING_DATASOURCE_PASSWORD
echo
export SPRING_DATASOURCE_PASSWORD
read -rsp 'Nhap JWT_SECRET da tao (hoac tao mot lan bang openssl rand -base64 32): ' JWT_SECRET
echo
export JWT_SECRET
# Neu dung tro ly AI: read -rsp 'Nhap GEMINI_API_KEY: ' GEMINI_API_KEY; echo; export GEMINI_API_KEY
mvn spring-boot:run
```

Không đưa mật khẩu MySQL, JWT secret hoặc API key AI vào README, ảnh chụp cấu hình hay commit Git. `application.properties` hiện có mật khẩu MySQL mẫu được ghi trực tiếp; khi chạy hãy đặt `SPRING_DATASOURCE_PASSWORD` để ghi đè và thay mật khẩu mẫu trước khi dùng ngoài môi trường demo. Tính năng AI cần Gemini API key riêng hợp lệ; chat, đăng nhập và WebSocket có thể kiểm thử trước. Nếu mở terminal mới để chạy lại backend, cần đặt lại các biến trên; cách A cấu hình trong IntelliJ sẽ tiện hơn.

Kiểm tra cổng backend từ một terminal khác:

```bash
sudo ss -ltnp '( sport = :8080 )'
```

## 6. Chạy frontend để lập trình (tùy chọn)

```bash
cd ~/smart-messenger/frontend
npm ci --include=optional
npm run dev
```

Truy cập `http://localhost:5173`. `vite.config.js` proxy `/api` và `/ws` sang `localhost:8080`; backend và MySQL phải chạy. Dùng **Ctrl+C** để tắt Vite. Sau khi chép thư mục từ Windows, nếu lỗi `Cannot find module @rollup/rollup-linux-x64-gnu`, chạy `rm -rf node_modules` tại thư mục `frontend` rồi `npm ci --include=optional` ngay trên Ubuntu; **giữ `package-lock.json`**. Nếu `npm ci` báo lockfile không tương thích, kiểm tra lỗi trước khi dùng `npm install`; không dùng `sudo npm`.

## 7. Đưa frontend lên Nginx ở cổng 80

Tạo bản build và chép file tĩnh đến thư mục web:

```bash
cd ~/smart-messenger/frontend
npm ci --include=optional
npm run build
sudo install -d -m 755 /var/www/smart-messenger
sudo cp -a dist/. /var/www/smart-messenger/
```

Nếu build thất bại, đọc lỗi và sửa trước khi tiếp tục. Sau mỗi lần thay mã nguồn frontend, cần build và chép lại `dist` vào `/var/www/smart-messenger/`; `npm run dev` ở cổng 5173 không cập nhật bản Nginx cổng 80. Tạo site Nginx:

```bash
sudo tee /etc/nginx/sites-available/smart-messenger >/dev/null <<'EOF'
server {
    listen 80;
    server_name localhost;

    root /var/www/smart-messenger;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /ws {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 3600s;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF
```

`/ws` khớp cả `/ws-native` mà `frontend/src/services/websocket.js` sử dụng. Bật site (chỉ làm lần đầu):

```bash
sudo ln -s /etc/nginx/sites-available/smart-messenger /etc/nginx/sites-enabled/smart-messenger
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
```

Chỉ khi `nginx -t` báo `syntax is ok` và `test is successful` mới chạy:

```bash
sudo systemctl enable --now nginx
sudo systemctl reload nginx
curl -s http://localhost/ | grep -E 'Smart Messenger|Welcome to nginx'
```

Phải thấy `<title>Smart Messenger</title>`. Nếu thấy `Welcome to nginx`, kiểm tra file `sites-enabled` và reload lại. Nếu cổng 80 bị chiếm, chạy `sudo ss -ltnp '( sport = :80 )'` để xem dịch vụ nào đang dùng, không tắt dịch vụ khác khi chưa xác định.

## 8. Kiểm tra đầy đủ và demo

Kiểm tra API qua Nginx. Lệnh sau chỉ in mã HTTP, **không in JWT**:

```bash
curl -s -o /dev/null -w '%{http_code}\n' \
  -H 'Content-Type: application/json' \
  -d '{"username":"sinhvien1","password":"password123"}' \
  http://localhost/api/auth/login
```

Kết quả dự kiến `200`. Truy cập `http://localhost`:

1. Cửa sổ thường đăng nhập `sinhvien1` / `password123`.
2. Cửa sổ riêng tư đăng nhập `sinhvien2` / `password123`.
3. Gửi tin nhắn giữa hai tài khoản; bên nhận phải thấy tin nhắn mà không tải lại trang. Đây là kiểm tra WebSocket qua Nginx.
4. Thử tải lại trang `/login` trực tiếp để kiểm tra cấu hình React Router (`try_files`).

Các cổng cần nhớ: `80` Nginx; `8080` Spring Boot; `3306` MySQL chỉ localhost; `5173` Vite chỉ khi phát triển.

## 9. Lần sau mở máy và khi cập nhật mã nguồn

- Nginx được bật tự khởi động bằng `systemctl enable`; container MySQL có `--restart unless-stopped` nếu Docker chạy. Kiểm tra `sudo systemctl is-active nginx`, `sudo docker ps --filter name=smart-messenger-mysql`.
- Backend **chưa được cài làm dịch vụ systemd**: mở IntelliJ và Run lại, hoặc chạy `mvn spring-boot:run` với các biến môi trường ở bước 5.
- Không cần chạy `npm run dev` khi truy cập qua Nginx.
- Khi frontend thay đổi, chạy lại `npm run build` rồi `sudo cp -a dist/. /var/www/smart-messenger/`. Nếu sửa Nginx, chạy `sudo nginx -t` rồi `sudo systemctl reload nginx`.
- Nếu muốn lấy commit mới: tại thư mục dự án chạy `git status` trước, sau đó `git pull` khi đã lưu các thay đổi cá nhân. Kiểm tra lại cấu hình và build.
- Nếu cần truy cập từ máy khác trong LAN, dùng địa chỉ IP của Ubuntu, chỉnh `server_name`/cấu hình mạng và firewall cho cổng 80; `localhost` chỉ là máy đang chạy ứng dụng. Chưa có HTTPS/domain trong quy trình demo này.

## 10. Lỗi thường gặp

| Triệu chứng | Kiểm tra hoặc xử lý |
| --- | --- |
| `mysql.service not found` | MySQL chạy **trong Docker**, xem `sudo docker ps -a --filter name=smart-messenger-mysql`, không dùng `systemctl start mysql`. |
| `Bad credentials` với tài khoản mẫu | Áp dụng lệnh sửa BCrypt ở bước 4; không cần xóa database. |
| Tiếng Việt sai hoặc mất dấu | Áp dụng các lệnh `CONVERT(0x... USING utf8mb4)` ở bước 4; xem `HEX(full_name)` để xác nhận. |
| `502 Bad Gateway` sau Nginx | Kiểm tra backend cổng 8080 và log IntelliJ/Maven; kiểm tra `sudo ss -ltnp '( sport = :8080 )'`. |
| Nginx báo `200` nhưng hiện trang chào | Xem nội dung `curl -s http://localhost/ | grep -E 'Smart Messenger|Welcome to nginx'`; kiểm tra site đã bật, site mặc định đã tắt. |
| Frontend hiện nhưng API lỗi | Kiểm tra MySQL, backend, `curl` đăng nhập qua cổng 80 và log Nginx `/var/log/nginx/error.log`. |
| API được nhưng tin nhắn không đến ngay | Xem DevTools → Network → WS cho `/ws-native`; kiểm tra block `location /ws` và thử đăng nhập bằng hai phiên khác nhau. |
| `port 3306 already allocated` | Chạy `sudo ss -ltnp '( sport = :3306 )'`, xác định dịch vụ chiếm cổng trước khi tạo container. |
| `mysql -u root -p` báo `Access denied` | Nhập mật khẩu **MySQL root**, không phải mật khẩu `sudo`. Terminal không hiển thị ký tự khi gõ; nên chuyển bộ gõ sang English. Không xóa container/volume để thử lại. |
| Gửi ảnh/tệp báo HTTP 500 | Kiểm tra cột `messages.message_type`; nếu thiếu `IMAGE`, `FILE`, chạy migration ở bước 4 một lần. |
| Chọn ảnh đại diện báo "PNG hoặc JPEG, tối đa 20 MB và 20 triệu điểm ảnh" | Backend kiểm tra nội dung ảnh; thử ảnh PNG/JPEG thật, dưới 20 MB và tích rộng × cao không quá 20 triệu. |
| AI báo `Chưa có GEMINI_API_KEY` | Đặt `GEMINI_API_KEY` trong **Run Configuration** IntelliJ (hoặc terminal chạy backend), nhấn OK để lưu, Stop/Run backend. Biến trong file `.env` không tự động được Spring Boot đọc. |
| Nginx `200` nhưng đăng nhập/API không hoạt động | `200` chỉ xác nhận file tĩnh; kiểm tra Java có nghe cổng 8080 và gọi API đăng nhập qua cổng 80 như bước 8. |

**Lưu ý:** README này mô tả bản Java + React ở repository trên. Một dự án SmartMessenger .NET/SQL Server khác sẽ cần hướng dẫn riêng.
