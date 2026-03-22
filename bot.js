const TelegramBot = require('node-telegram-bot-api');
const Redis = require('ioredis');
const db = require('./shared/db');
const logger = require('./shared/logger');

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  logger.error('TELEGRAM_BOT_TOKEN is missing!');
  process.exit(1);
}

const bot = new TelegramBot(token, { 
  polling: {
    interval: 300,
    autoStart: true,
    params: { timeout: 10 }
  }
});

bot.on('polling_error', (error) => {
  if (error.code === 'EFATAL') {
    logger.warn('Telegram Polling Fatal Error, retrying...', { error: error.message });
  } else {
    logger.error('Telegram Polling Error', { error: error.message });
  }
});

const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379');
logger.info('Telegram Assistant Bot started...');

const removeVietnameseTones = (str) => {
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
  str = str.replace(/đ/g, "d");
  str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
  str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
  str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
  str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
  str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
  str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
  str = str.replace(/Đ/g, "D");
  return str;
};

// 1. /start
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, `Chào mừng Sếp quay lại! 🚀\n\n🔍 /search [tên] - Tìm truyện\n📜 /latest - Truyện sẵn sàng đọc\n🔔 /subs - Đang theo dõi\n📊 /stats - Thống kê hệ thống\n💣 /flush - Dọn dẹp hàng đợi\n\nSếp muốn đọc gì hôm nay? 😎`);
});

// 2. /latest
bot.onText(/\/latest/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const result = await db.query(`
      SELECT DISTINCT m.id, m.title 
      FROM mangas m 
      JOIN chapters c ON m.id = c.manga_id 
      JOIN chapter_images ci ON c.id = ci.chapter_id 
      WHERE ci.telegram_file_id IS NOT NULL 
      ORDER BY m.id DESC LIMIT 10
    `);
    if (result.rows.length === 0) return bot.sendMessage(chatId, "⚠️ Đang cào ảnh... Hiện chưa có bộ nào có sẵn ảnh Telegram sếp ơi!");
    const keyboard = result.rows.map(m => ([{ text: `📖 ${m.title}`, callback_data: `manga:${m.id}` }]));
    bot.sendMessage(chatId, "🔥 Top 10 bộ truyện ĐÃ CÓ ẢNH trên Telegram:", { reply_markup: { inline_keyboard: keyboard } });
  } catch (err) { logger.error('Bot Latest Error', err); }
});

// 3. /stats (Boss Feature)
bot.onText(/\/stats/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const mangaCount = (await db.query("SELECT COUNT(*) FROM mangas")).rows[0].count;
    const chapCount = (await db.query("SELECT COUNT(*) FROM chapters")).rows[0].count;
    const tgImgCount = (await db.query("SELECT COUNT(*) FROM chapter_images WHERE telegram_file_id IS NOT NULL")).rows[0].count;
    
    bot.sendMessage(chatId, `📊 *THỐNG KÊ HỆ THỐNG*\n\n📚 Tổng số truyện: ${mangaCount}\n📑 Tổng số chương: ${chapCount}\n☁️ Ảnh trên Telegram: ${tgImgCount}\n\nWorker đang đẩy ảnh "tằng tằng" sếp nhé! 😎`, { parse_mode: 'Markdown' });
  } catch (err) { logger.error('Bot Stats Error', err); }
});

// 4. /search
bot.onText(/\/search (.+)/, async (msg, match) => {
  const rawQuery = match[1].trim();
  const query = removeVietnameseTones(rawQuery).replace(/\s+/g, '%');
  try {
    const result = await db.query(
      "SELECT id, title FROM mangas WHERE title ILIKE $1 OR slug ILIKE $1 OR REPLACE(slug, '-', ' ') ILIKE $1 LIMIT 5",
      [`%${query}%`]
    );
    if (result.rows.length === 0) return bot.sendMessage(msg.chat.id, `😅 Không tìm thấy "${rawQuery}".`);
    const keyboard = result.rows.map(m => ([{ text: `📁 ${m.title}`, callback_data: `manga:${m.id}` }]));
    bot.sendMessage(msg.chat.id, `Tôi tìm thấy mấy bộ này:`, { reply_markup: { inline_keyboard: keyboard } });
  } catch (err) { logger.error('Bot Search Error', err); }
});

// 5. /flush (Boss Feature)
bot.onText(/\/flush/, async (msg) => {
  try {
    await redis.flushall();
    bot.sendMessage(msg.chat.id, "💣 Đã dọn dẹp sạch sẽ hàng đợi (Redis)! Giờ sếp có thể cào mới hoàn toàn rồi đó.");
  } catch (err) { logger.error('Bot Flush Error', err); }
});

// 6. Callback Processing
bot.on('callback_query', async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;

  if (data === 'noop') return bot.answerCallbackQuery(callbackQuery.id, { text: "Chương này đang cào, sếp thư thả tí nhé! ⏳", show_alert: true });

  // Chọn bộ truyện / Phân trang chương
  if (data.startsWith('manga:')) {
    const [_, mangaId, offsetStr] = data.split(':');
    const offset = parseInt(offsetStr || '0');
    const limit = 10;

    const manga = (await db.query("SELECT title, slug FROM mangas WHERE id = $1", [mangaId])).rows[0];
    const chapters = await db.query(`
      SELECT c.id, c.chapter_number, 
             EXISTS(SELECT 1 FROM chapter_images ci WHERE ci.chapter_id = c.id AND ci.telegram_file_id IS NOT NULL) as has_images
      FROM chapters c WHERE c.manga_id = $1 
      ORDER BY c.chapter_number ASC 
      LIMIT $2 OFFSET $3
    `, [mangaId, limit + 1, offset]);

    const hasMore = chapters.rows.length > limit;
    const batch = chapters.rows.slice(0, limit);

    const keyboard = batch.map(c => ([{
      text: `${c.has_images ? '✅' : '⏳'} Chap ${c.chapter_number}`,
      callback_data: c.has_images ? `read:${c.id}:0` : `noop`
    }]));
    
    const controlRow = [];
    if (hasMore) {
      controlRow.push({ text: '➡️ 10 Chap tiếp', callback_data: `manga:${mangaId}:${offset + limit}` });
    }
    if (offset > 0) {
      controlRow.unshift({ text: '⬅️ 10 Chap trước', callback_data: `manga:${mangaId}:${Math.max(0, offset - limit)}` });
    }
    if (controlRow.length > 0) keyboard.push(controlRow);

    // Link Web (Fix localhost error for Telegram - Telegram blocks localhost/127.0.0.1)
    let webUrl = `https://nettruyenviet1.com/truyen-tranh/${manga.slug}`;
    if (process.env.FRONTEND_URL && !process.env.FRONTEND_URL.includes('localhost') && !process.env.FRONTEND_URL.includes('127.0.0.1')) {
      webUrl = `${process.env.FRONTEND_URL}/manga/${manga.slug}`;
    }
    keyboard.push([{ text: '🌐 Xem bản HD trên Web', url: webUrl }]);
    keyboard.push([{ text: '🔔 Theo dõi bộ này', callback_data: `sub:${mangaId}` }]);

    const text = `📙 *${manga.title}*\n\nChọn chương sếp muốn đọc (Đang hiện chap ${offset + 1} - ${offset + batch.length}):`;
    
    if (offset === 0 && !callbackQuery.message.text.includes('Chọn chương')) {
      bot.sendMessage(chatId, text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
    } else {
      bot.editMessageText(text, {
        chat_id: chatId,
        message_id: callbackQuery.message.message_id,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      }).catch(() => {});
    }
    bot.answerCallbackQuery(callbackQuery.id);
  }

  // Đọc truyện (có Next/Prev)
  if (data.startsWith('read:')) {
    const [_, chapterId, offsetStr] = data.split(':');
    const offset = parseInt(offsetStr);
    const limit = 15;

    const currentChap = (await db.query(`
      SELECT c.chapter_number, c.manga_id,
             (SELECT id FROM chapters WHERE manga_id = c.manga_id AND chapter_number < c.chapter_number ORDER BY chapter_number DESC LIMIT 1) as prev_id,
             (SELECT id FROM chapters WHERE manga_id = c.manga_id AND chapter_number > c.chapter_number ORDER BY chapter_number ASC LIMIT 1) as next_id
      FROM chapters c WHERE id = $1
    `, [chapterId])).rows[0];

    const images = await db.query(
      "SELECT telegram_file_id FROM chapter_images WHERE chapter_id = $1 AND telegram_file_id IS NOT NULL ORDER BY page_number ASC OFFSET $2 LIMIT $3",
      [chapterId, offset, limit + 1]
    );

    const hasMore = images.rows.length > limit;
    const batch = images.rows.slice(0, limit);

    if (offset === 0) await bot.sendMessage(chatId, `🚀 Đang tải Chap ${currentChap.chapter_number}...`);
    for (const img of batch) { await bot.sendPhoto(chatId, img.telegram_file_id); }

    const controlButtons = [];
    if (hasMore) {
      controlButtons.push({ text: 'Hiện nốt ⬇️', callback_data: `read:${chapterId}:${offset + limit}` });
    } else {
      // Khi đã hiện hết ảnh, cho hiện nút Next/Prev
      const navButtons = [];
      if (currentChap.prev_id) navButtons.push({ text: '⬅️ Chap trước', callback_data: `read:${currentChap.prev_id}:0` });
      if (currentChap.next_id) navButtons.push({ text: 'Chap sau ➡️', callback_data: `read:${currentChap.next_id}:0` });
      if (navButtons.length > 0) controlButtons.push(...navButtons);
    }

    if (controlButtons.length > 0) {
      bot.sendMessage(chatId, hasMore ? `...vẫn còn ảnh:` : `✨ Hết chương ${currentChap.chapter_number}.`, {
        reply_markup: { inline_keyboard: [controlButtons] }
      });
    }
    bot.answerCallbackQuery(callbackQuery.id);
  }

  // Sub
  if (data.startsWith('sub:')) {
    await db.query("INSERT INTO user_subscriptions (manga_id, telegram_chat_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [data.split(':')[1], chatId]);
    bot.answerCallbackQuery(callbackQuery.id, { text: "Đã theo dõi! 😎" });
  }
});
