const express = require('express');
const axios = require('axios');
const router = express.Router();
const logger = require('../../shared/logger');

router.get('/', async (req, res) => {
  const imageUrl = req.query.url;
  if (!imageUrl) return res.status(400).send('Missing URL');

  const headers = {
    'Referer': 'https://nettruyenviet1.com/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
  };

  try {
    const response = await axios.get(imageUrl, {
      headers,
      responseType: 'arraybuffer',
      timeout: 30000,
      validateStatus: () => true, // Handle all status codes
    });

    if (response.status >= 400) {
      throw new Error(`Upstream returned ${response.status}`);
    }

    const contentType = response.headers['content-type'] || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(Buffer.from(response.data));
  } catch (err) {
    logger.error(`[IMAGE_PROXY] Failed ${imageUrl}: ${err.message}`);
    
    // Fallback 1: Try without referer
    try {
      const secondRes = await axios.get(imageUrl, {
        headers: { 'User-Agent': headers['User-Agent'] },
        responseType: 'arraybuffer',
        timeout: 15000,
      });
      res.setHeader('Content-Type', secondRes.headers['content-type'] || 'image/jpeg');
      return res.send(Buffer.from(secondRes.data));
    } catch (err2) {
      // Fallback 2: Telegram
      try {
        const db = require('../../shared/db');
        const imgRes = await db.query('SELECT telegram_file_id FROM chapter_images WHERE image_url = $1 LIMIT 1', [imageUrl]);
        
        if (imgRes.rows[0]?.telegram_file_id && process.env.TELEGRAM_BOT_TOKEN) {
          const fileId = imgRes.rows[0].telegram_file_id;
          const botToken = process.env.TELEGRAM_BOT_TOKEN;
          
          const pathRes = await axios.get(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
          const filePath = pathRes.data.result.file_path;
          
          const tgImg = await axios.get(`https://api.telegram.org/file/bot${botToken}/${filePath}`, {
            responseType: 'arraybuffer',
            timeout: 20000
          });
          
          res.setHeader('Content-Type', tgImg.headers['content-type'] || 'image/jpeg');
          return res.send(Buffer.from(tgImg.data));
        }
      } catch (err3) {
        logger.error(`[IMAGE_PROXY_FALLBACK] Failed all for ${imageUrl}`);
      }
    }
    
    return res.status(500).send('Proxy failure');
  }
});

module.exports = router;
