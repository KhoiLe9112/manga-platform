const express = require('express');
const axios = require('axios');
const router = express.Router();
const logger = require('../../shared/logger');

router.get('/', async (req, res) => {
  const imageUrl = req.query.url;
  if (!imageUrl) return res.status(400).send('Missing URL');

  const proxyImage = async (referer) => {
    return await axios({
      url: imageUrl,
      method: 'GET',
      responseType: 'stream',
      headers: {
        'Referer': referer,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      timeout: 25000, // 25s
    });
  };

  try {
    // Try primary referer
    let response;
    try {
      response = await proxyImage('https://nettruyenviet1.com/');
    } catch (err) {
      logger.warn(`Primary proxy failed for ${imageUrl}, trying secondary referer...`);
      response = await proxyImage('https://www.nettruyennew.com/');
    }

    const contentType = response.headers['content-type'] || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    response.data.pipe(res);
  } catch (err) {
    logger.error(`Image proxy failed for ${imageUrl}: ${err.message}`);
    
    // Telegram Fallback
    try {
      const db = require('../../shared/db');
      const imgRes = await db.query('SELECT telegram_file_id FROM chapter_images WHERE image_url = $1 LIMIT 1', [imageUrl]);
      
      if (imgRes.rows[0]?.telegram_file_id && process.env.TELEGRAM_BOT_TOKEN) {
        const fileId = imgRes.rows[0].telegram_file_id;
        const pathRes = await axios.get(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`);
        const filePath = pathRes.data.result.file_path;
        
        const tgImg = await axios({
          url: `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${filePath}`,
          method: 'GET',
          responseType: 'stream',
          timeout: 20000
        });
        
        res.setHeader('Content-Type', tgImg.headers['content-type'] || 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return tgImg.data.pipe(res);
      }
    } catch (fallbackErr) {
      logger.error(`Telegram fallback failed: ${fallbackErr.message}`);
    }

    // Last resort: If it's a cover, maybe try to fetch without referer
    try {
        const directRes = await axios.get(imageUrl, { responseType: 'stream', timeout: 15000 });
        res.setHeader('Content-Type', directRes.headers['content-type'] || 'image/jpeg');
        return directRes.data.pipe(res);
    } catch (finalErr) {
        res.status(500).send('Error fetching image');
    }
  }
});

module.exports = router;
