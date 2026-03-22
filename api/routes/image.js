const express = require('express');
const axios = require('axios');
const router = express.Router();
const logger = require('../../shared/logger');

router.get('/', async (req, res) => {
  const imageUrl = req.query.url;
  if (!imageUrl) return res.status(400).send('Missing URL');

  const uas = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  ];
  const ua = uas[Math.floor(Math.random() * uas.length)];

  const referers = [
    'https://www.nettruyennew.com/',
    'https://nettruyenviet1.com/',
    'https://www.nettruyenmoi.com/',
    '', // No referer
  ];

  let lastError = null;

  for (const referer of referers) {
    try {
      const response = await axios.get(imageUrl, {
        headers: {
          'Referer': referer,
          'User-Agent': ua,
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        },
        responseType: 'arraybuffer',
        timeout: 15000,
      });

      if (response.status === 200) {
        const contentType = response.headers['content-type'] || 'image/jpeg';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.send(Buffer.from(response.data));
      }
    } catch (err) {
      lastError = err;
      logger.warn(`Proxy fail with referer ${referer}: ${err.message}`);
    }
  }

  // Telegram Fallback (as final resort)
  try {
    const db = require('../../shared/db');
    const imgRes = await db.query('SELECT telegram_file_id FROM chapter_images WHERE image_url = $1 LIMIT 1', [imageUrl]);
    if (imgRes.rows[0]?.telegram_file_id && process.env.TELEGRAM_BOT_TOKEN) {
      const fileId = imgRes.rows[0].telegram_file_id;
      const pathRes = await axios.get(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`);
      const filePath = pathRes.data.result.file_path;
      const tgImg = await axios.get(`https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${filePath}`, {
        responseType: 'arraybuffer',
        timeout: 20000
      });
      res.setHeader('Content-Type', tgImg.headers['content-type'] || 'image/jpeg');
      return res.send(Buffer.from(tgImg.data));
    }
  } catch (tgErr) {
    logger.error(`Final fallback fail: ${tgErr.message}`);
  }

  res.status(500).json({ 
    error: 'Proxy Error', 
    message: lastError?.message,
    status: lastError?.response?.status,
    url: imageUrl
  });
});

module.exports = router;
