/**
 * Backfill Telegram Cover IDs
 * Chạy: node scripts/backfill_telegram_covers.js
 * Tải ảnh bìa lên Telegram cho toàn bộ truyện chưa có telegram_cover_id
 */
require('dotenv').config();
const axios = require('axios');
const FormData = require('form-data');
const { Pool } = require('pg');

const args = process.argv.slice(2).reduce((acc, current, i, arr) => {
  if (current.startsWith('--')) {
    const key = current.slice(2).replace(/-/g, '_').toUpperCase();
    acc[key] = arr[i + 1];
  }
  return acc;
}, {});

const DB_URL = args.DATABASE_URL || process.env.DATABASE_URL || process.env.DB_URL;
const BOT_TOKEN = args.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = args.TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHAT_ID;

const pool = new Pool({
  connectionString: DB_URL,
  ssl: { rejectUnauthorized: false }
});

const DELAY_MS = 1500; // Tránh spam Telegram API

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const uploadToTelegram = async (imageUrl) => {
  const referers = [
    'https://www.nettruyennew.com/',
    'https://nettruyenviet1.com/',
    'https://www.nettruyenmoi.com/',
    'https://nettruyenco.vn/',
  ];

  let imageBuffer = null;
  for (const referer of referers) {
    try {
      const res = await axios.get(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': referer,
          'Accept': 'image/*',
        },
        responseType: 'arraybuffer',
        timeout: 15000,
      });
      if (res.status === 200) {
        imageBuffer = Buffer.from(res.data);
        break;
      }
    } catch (_) {}
  }

  if (!imageBuffer) throw new Error('Cannot download image from any referer');

  const form = new FormData();
  form.append('chat_id', CHAT_ID);
  form.append('photo', imageBuffer, { filename: 'cover.jpg', contentType: 'image/jpeg' });

  const tgRes = await axios.post(
    `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`,
    form,
    { headers: form.getHeaders(), timeout: 30000 }
  );

  // Lấy file_id lớn nhất (chất lượng cao nhất)
  const photos = tgRes.data.result.photo;
  return photos[photos.length - 1].file_id;
};

const run = async () => {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.error('❌ Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID in .env');
    process.exit(1);
  }

  // Lấy tất cả truyện chưa có telegram_cover_id
  const { rows } = await pool.query(`
    SELECT id, title, cover FROM mangas 
    WHERE telegram_cover_id IS NULL AND cover IS NOT NULL
    ORDER BY updated_at DESC
  `);

  console.log(`🔱 Tìm thấy ${rows.length} truyện chưa có ảnh Telegram. Bắt đầu upload...`);

  let success = 0, fail = 0;

  for (let i = 0; i < rows.length; i++) {
    const manga = rows[i];
    try {
      const fileId = await uploadToTelegram(manga.cover);
      await pool.query('UPDATE mangas SET telegram_cover_id = $1 WHERE id = $2', [fileId, manga.id]);
      success++;
      console.log(`✅ [${i + 1}/${rows.length}] ${manga.title}`);
    } catch (err) {
      fail++;
      console.log(`❌ [${i + 1}/${rows.length}] ${manga.title} → ${err.message}`);
    }
    await sleep(DELAY_MS);
  }

  console.log(`\n🏁 Xong! Thành công: ${success} | Thất bại: ${fail}`);
  await pool.end();
};

run().catch(console.error);
