const express = require('express');
const axios = require('axios');
const router = express.Router();
const logger = require('../../shared/logger');

router.get('/', async (req, res) => {
  const imageUrl = req.query.url;
  if (!imageUrl) return res.status(400).send('Missing URL');

  const uas = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  ];
  const ua = uas[Math.floor(Math.random() * uas.length)];

  // Order of referers - important for bypassing hotlink protection
  const referers = [
    'https://www.nettruyennew.com/',
    'https://nettruyenviet1.com/',
    'https://www.nettruyenmoi.com/',
  ];

  let lastError = null;

  // 1. Try to fetch directly through proxy
  for (const referer of referers) {
    try {
      const response = await axios.get(imageUrl, {
        headers: {
          'Referer': referer,
          'User-Agent': ua,
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        },
        responseType: 'arraybuffer',
        timeout: 10000,
      });

      if (response.status === 200) {
        const contentType = response.headers['content-type'] || 'image/jpeg';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=604800'); // Cache 1 week
        const imageBuffer = Buffer.from(response.data);
        
        // Background: If this is a manga cover, try to upload to Telegram for future use
        // (Don't await this to keep response fast)
        if (imageUrl.includes('/thumb/') && process.env.TELEGRAM_BOT_TOKEN) {
          uploadAndCacheTelegram(imageUrl, imageBuffer).catch(e => logger.warn(`BG Upload failed: ${e.message}`));
        }
        
        return res.send(imageBuffer);
      }
    } catch (err) {
      lastError = err;
      if (err.response?.status === 403) continue; // Try next referer
      break; 
    }
  }

  // 2. Fallback: Try Telegram Database
  try {
    const db = require('../../shared/db');
    
    // Check both manga covers and chapter images
    const fileRes = await db.query(
      `SELECT telegram_cover_id as fid FROM mangas WHERE cover = $1 
       UNION 
       SELECT telegram_file_id as fid FROM chapter_images WHERE image_url = $1 
       LIMIT 1`, 
      [imageUrl]
    );
    
    const fileId = fileRes.rows[0]?.fid;
    
    if (fileId && process.env.TELEGRAM_BOT_TOKEN) {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const pathRes = await axios.get(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
      const filePath = pathRes.data.result.file_path;
      
      const tgImg = await axios.get(`https://api.telegram.org/file/bot${botToken}/${filePath}`, {
        responseType: 'arraybuffer',
        timeout: 20000
      });
      
      res.setHeader('Content-Type', tgImg.headers['content-type'] || 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache 1 year (Telegram IDs are permanent)
      return res.send(Buffer.from(tgImg.data));
    }
  } catch (err3) {
    logger.error(`[IMAGE_PROXY_FALLBACK] Failed all for ${imageUrl}: ${err3.message}`);
  }

  res.status(lastError?.response?.status || 500).json({ 
    error: 'Proxy Error', 
    message: lastError?.message,
    status: lastError?.response?.status,
    url: imageUrl
  });
});

/**
 * Background helper to upload successfull images to Telegram and update DB
 */
async function uploadAndCacheTelegram(url, buffer) {
  const db = require('../../shared/db');
  const FormData = require('form-data');
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
  
  const form = new FormData();
  form.append('chat_id', CHAT_ID);
  form.append('photo', buffer, { filename: 'image.jpg', contentType: 'image/jpeg' });
  
  const tgRes = await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, form, {
    headers: form.getHeaders(),
    timeout: 30000
  });
  
  const fileId = tgRes.data.result.photo.slice(-1)[0].file_id;
  
  // Update mangas table if it's a cover
  await db.query('UPDATE mangas SET telegram_cover_id = $1 WHERE cover = $2', [fileId, url]);
}

module.exports = router;
