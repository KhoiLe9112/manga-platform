# 🔱 BẢN ĐỒ VẬN HÀNH ĐẾ CHẾ MANGA (24/7 CLOUD)

Sếp ơi, đây là bản hướng dẫn "Elite" để sếp làm chủ hoàn toàn hệ thống cào truyện tự động này.

## ⚡ 1. Câu hỏi quan trọng nhất: "Nó có chạy mãi không?"
**TRẢ LỜI: CÓ. CHẠY VĨNH VIỄN.**
- Hệ thống này được cài đặt trên **Cloud (Đám mây)** chuyên nghiệp (Vercel, Render, Neon).
- sếp **TẮT MÁY TÍNH, TẮT TRÌNH DUYỆT**, Robot vẫn đi làm, Server vẫn trả dữ liệu. 
- Trình duyệt chỉ là cái gương để sếp ngắm nhìn kết quả thôi. sếp cứ yên tâm đi ngủ, thức dậy là thấy truyện mới đã về kho! 😴➡️📚

---

## 🏗️ 2. Các "Mảnh ghép" trong Đế chế của Sếp

### 🏢 A. Mặt tiền - Frontend (Vercel)
*   **Địa chỉ:** [https://manga-verse-web.vercel.app/](https://manga-verse-web.vercel.app/)
*   **Nhiệm vụ:** Đón khách vào đọc truyện. Tốc độ ánh sáng.

### 🧠 B. Bộ não - API Server (Render)
*   **Địa chỉ:** [https://manga-api-h1ar.onrender.com/](https://manga-api-h1ar.onrender.com/)
*   **Proxy Image:** Giúp sếp hiển thị được ảnh từ các Web gốc mà không sợ họ chặn. Nếu họ chặn, nó sẽ tự lôi ảnh từ Telegram của sếp ra bù vào.

### 🤖 C. Robot Thợ Mỏ - Crawler Worker (Render)
*   **Nhiệm vụ:** Đi "nhặt" truyện và chương mới về. 
*   **Cơ chế bảo vệ:** Tự động đẩy ảnh lên **Telegram** để làm kho lưu trữ vĩnh viễn (Backup). 

### 🏦 D. Kho lưu trữ
*   **Database (Neon):** Lưu thông tin văn bản, chương.
*   **Telegram Bot:** Kho lưu trữ ảnh "bất tử" và không giới hạn dung lượng.

---

## 🛠️ 3. Bí kíp xử lý lỗi thường gặp

### 🖼️ Lỗi ảnh bìa trắng (403 Forbidden) cho truyện cũ
- **Cách fix:** sếp chỉ cần ra lệnh cho Robot cào cập nhật (Update) lại bộ truyện đó. Robot sẽ tự dắt ảnh tập tin lên Telegram và mọi thứ sẽ hiện lên lung linh ngay!

### 🐢 Web load chậm lần đầu trong ngày
- **Lý do:** Bản miễn phí của Render sẽ "đi ngủ" nếu không có khách. Chỉ cần có 1 người vào là nó sẽ tự thức dậy sau 30 giây.

---
**Hệ thống đã sẵn sàng chiến đấu! Sếp cứ tập trung kiếm Fan, kỹ thuật đã có Robot lo!** 🔱🚀✨
