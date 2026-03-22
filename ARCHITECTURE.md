# Tài liệu Kiến trúc Hệ thống - Manga Reading Platform

Tài liệu này mô tả chi tiết kiến trúc, các thành phần và luồng hoạt động của hệ thống đọc truyện tranh tự động.

## 1. Tổng quan kiến trúc
Hệ thống được thiết kế theo mô hình **Microservices-ready** với các thành phần được tách biệt rõ rệt để đảm bảo khả năng mở rộng (scalability) và hiệu suất cao.

### Sơ đồ luồng dữ liệu (Data Flow)
`Nguồn dữ liệu` -> `Crawler Worker` -> `PostgreSQL` & `Telegram Cloud (Upload)`
`API Server` <-> `Redis (Cache)`
`Người dùng` <-> `Frontend (Next.js)` <-> `API Server` (Fallback -> `Telegram Cloud`)
`Người dùng` <-> `Telegram Bot` <-> `PostgreSQL` & `Telegram Cloud`

---

## 2. Các thành phần chính

### 2.1. Distributed Crawler & Telegram Uploader
- **Công nghệ:** Node.js, BullMQ, Redis, Axios.
- **Cơ chế:**
    - **Dispatcher:** Tạo Job cào danh sách và chương mới.
    - **Workers:** Tải ảnh từ nguồn, upload lên Telegram và lưu mapping.
- **Chiến lược An toàn:**
    - Delay 10-20 giây cho mỗi lần upload Telegram.
    - Tự động tạm dừng khi Telegram báo bận (Lỗi 429).

### 2.2. API Server & Smart Image Proxy
- **Cơ chế Fallback (Dự phòng):**
    - Ưu tiên lấy ảnh từ nguồn gốc để tiết kiệm tài nguyên.
    - Tự động chuyển sang ảnh từ Telegram nếu URL gốc lỗi (403, 404, Timeout).

### 2.3. Telegram Bot Assistant
- **Tính năng:** Tìm kiếm truyện, đọc trực tiếp trên Telegram và đăng ký nhận thông báo chương mới tự động.

### 2.4. Cơ sở dữ liệu (Database)
- **Công nghệ:** PostgreSQL 15 (GMT+7 Timezone).
- **Lưu trữ:** Metadata truyện và Mapping ID file Telegram.

---

## 3. Luồng công việc (Jobs)
1. `discover-manga`: Tìm truyện mới.
2. `crawl-manga-detail`: Cào thông tin & chương.
3. `crawl-chapter-images`: Cào ảnh & Upload Telegram.

---

## 4. Triển khai & Khả năng mở rộng
- **Docker Compose:** Quản lý toàn bộ 6 dịch vụ (db, redis, api, bot, worker, dispatcher, frontend).
- **Quy mô:** Hỗ trợ lưu trữ hàng triệu ảnh truyện hoàn toàn miễn phí trên Cloud Telegram.
