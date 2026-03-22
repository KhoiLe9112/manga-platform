# Hệ thống Đọc Truyện Tranh (Manga Reading Platform)

Hệ thống đọc truyện tranh tự động lấy dữ liệu từ `nettruyenviet1.com` với kiến trúc Production-grade:
- **Crawler**: Phân tán (Distributed) sử dụng Redis và BullMQ, hỗ trợ delay an toàn.
- **Backend**: Express API với Redis Caching, Image Proxy tích hợp cơ chế Dự phòng (Fallback) từ Telegram.
- **Frontend**: Next.js (Tailwind CSS) tối ưu Reader (Lazy load, Lưu lịch sử, Scroll position).
- **Telegram Bot**: Trợ lý đa năng (Thông báo chap mới, Đọc ngầm, Tìm kiếm bộ truyện).
- **Storage**: Lưu trữ ảnh truyện "bất tử" trên Cloud Telegram hoàn toàn miễn phí.
- **Database**: PostgreSQL với Full-text Search.
- **Container**: Docker Compose cực kỳ dễ dàng cài đặt và quản lý.

## Cấu trúc dự án
- `crawler/`: Dispatcher và Workers xử lý cào dữ liệu và upload Telegram.
- `api/`: Cung cấp RESTful API và Image Proxy (với Fallback Telegram).
- `frontend/`: Giao diện người dùng Next.js.
- `bot.js`: Mã nguồn Trợ lý Telegram đa năng.
- `shared/`: Các module dùng chung (DB, Logger, Queue).
- `database/`: Chứa file `init.sql` khởi tạo DB.

## Cách chạy hệ thống

### Yêu cầu
- Đã cài đặt Docker và Docker Compose.
- Một tài khoản Telegram và Bot API Token.

### Triển khai Local
1. Cấu hình biến môi trường trong `docker-compose.yml` (Bot Token và Chat ID).
2. Chạy lệnh:
   ```bash
   docker compose up -d --build
   ```
3. Hệ thống đã được tối ưu để chạy mượt tại nhà với 3 luồng cào song song.

## Các tính năng nổi bật

- **Telegram Backup**: Tự động tải ảnh từ nguồn gốc vào bộ nhớ đệm (Buffer) và lưu trữ vĩnh viễn lên kho Telegram.
- **Smart Image Fallback**: Nếu ảnh gốc bị lỗi hoặc bị chặn, hệ thống tự động lấy ảnh từ Telegram để hiển thị cho người dùng.
- **Trợ lý Telegram (Bot)**: Tìm kiếm truyện, đăng ký nhận thông báo chương mới và đọc truyện ngay trong khung chat.
- **Tối ưu hóa Reader**: Trải nghiệm đọc mượt mà, tự động ẩn thanh điều khiển, giao diện Dark Mode cao cấp.
- **Tìm kiếm Tiếng Việt mạnh mẽ**: PostgreSQL Full-text Search hỗ trợ tìm kiếm có dấu cực kỳ chính xác.
- **Lịch sử đọc truyện**: Ghi nhớ chương cuối cùng sếp đã xem để tiếp tục hành trình dễ dàng.

## Bảo trì & Gỡ lỗi

- Xem log hệ thống (VN Time): `docker logs -f manga-platform-api-1`
- Xem tiến độ cào & upload TG: `docker logs -f manga-platform-crawler-worker-1`
- Xem hoạt động của Bot: `docker logs -f manga-platform-bot-1`
- Xóa toàn bộ hàng đợi: `docker exec manga-platform-redis-1 redis-cli FLUSHALL`
