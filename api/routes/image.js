const express = require('express');
const axios = require('axios');
const router = express.Router();
const logger = require('../../shared/logger');

router.get('/', async (req, res) => {
  const imageUrl = req.query.url;
  if (!imageUrl) return res.status(400).send('Missing URL');

  try {
    const response = await axios({
      url: imageUrl,
      method: 'GET',
      responseType: 'stream',
      headers: {
        'Referer': 'https://nettruyenviet1.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000,
    });

    res.setHeader('Content-Type', response.headers['content-type']);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    response.data.pipe(res);
  } catch (err) {
    logger.warn(`Image proxy failed for ${imageUrl}, trying Telegram fallback...`);
    
    // Try to find if we have a telegram_file_id for this image
    try {
      const db = require('../../shared/db');
      const imgRes = await db.query('SELECT telegram_file_id FROM chapter_images WHERE image_url = $1 LIMIT 1', [imageUrl]);
      
      if (imgRes.rows[0]?.telegram_file_id && process.env.TELEGRAM_BOT_TOKEN) {
        const fileId = imgRes.rows[0].telegram_file_id;
        
        // 1. Get file path from Telegram
        const pathRes = await axios.get(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`);
        const filePath = pathRes.data.result.file_path;
        
        // 2. Fetch image from Telegram servers
        const tgImg = await axios({
          url: `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${filePath}`,
          method: 'GET',
          responseType: 'stream',
          timeout: 10000
        });
        
        res.setHeader('Content-Type', tgImg.headers['content-type'] || 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return tgImg.data.pipe(res);
      }
    } catch (fallbackErr) {
      logger.error(`Telegram fallback failed: ${fallbackErr.message}`);
    }

    res.status(500).send('Error fetching image');
  }
});

module.exports = router;
