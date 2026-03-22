# 🤖 Hướng dẫn sử dụng Trợ lý Telegram (Manga Bot)

Con Bot này giúp sếp quản lý kho truyện, nhận thông báo chương mới và đọc truyện ngay trên Telegram.

## 🚀 Khởi động
1. Tìm con Bot của sếp trên Telegram (tên sếp đặt lúc tạo ở @BotFather).
2. Bấm nút **Start** hoặc gõ lệnh: `/start`.

## 🛠️ Các lệnh cơ bản

| Lệnh | Chức năng |
| :--- | :--- |
| `/start` | Kích hoạt Bot và hiện menu chính |
| `/search [tên truyện]` | Tìm kiếm bộ truyện trong kho dữ liệu của sếp |
| `/latest` | Xem danh sách các bộ truyện mới cập nhật |
| `/subs` | Xem danh sách các bộ truyện sếp đang theo dõi |

## 🔔 Cách đăng ký nhận thông báo (Notify)
Để không bỏ lỡ chương mới của các bộ truyện yêu thích:
1. Gõ `/search [tên truyện]` để tìm bộ truyện đó.
2. Bấm vào tên truyện hiện ra trong kết quả.
3. Bấm vào nút **"🔔 Theo dõi bộ này"**.
4. **Kết quả:** Ngay khi hệ thống cào xong chương mới, Bot sẽ nhắn tin báo sếp kèm link đọc ngay!

## 📖 Cách đọc truyện ngầm (Instant Reader)
Dành cho lúc mạng yếu hoặc sếp lười mở trình duyệt:
1. Tìm truyện qua lệnh `/search`.
2. Chọn chương sếp muốn đọc (Ví dụ: `Đọc Chap 10`).
3. Bot sẽ lấy ảnh từ kho Telegram và gửi trực tiếp vào khung chat. Bấm **"Hiện nốt"** nếu chương quá dài.

## 💡 Mẹo nhỏ cho Sếp
- **Ảnh bị mờ?** Telegram nén ảnh một chút để load nhanh, nếu sếp muốn xem ảnh gốc chất lượng cao, hãy bấm vào link Web kèm theo trong thông báo.
- **Bot không trả lời?** Có thể server ở nhà đang tắt hoặc Docker bị lỗi. Sếp check log bằng lệnh: `docker logs -f manga-platform-bot-1`.

---
*Chúc sếp có những giây phút đọc truyện vui vẻ!* 😎🚀⚡
