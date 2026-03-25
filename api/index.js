const express = require('express');
const cors = require('cors');
const Redis = require('ioredis');
const db = require('../shared/db');
const logger = require('../shared/logger');
const imageProxy = require('./routes/image');

const app = express();
const PORT = process.env.PORT || 4000;
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redisOptions = redisUrl.startsWith('rediss://') ? { tls: { rejectUnauthorized: false } } : {};
const redis = new Redis(redisUrl, redisOptions);

app.use(cors());
app.use(express.json());

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'vibe-manga-secret-key-2026';

// Auth & User Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);

// Redis Cache Middleware
const cache = (duration) => async (req, res, next) => {
  const key = `cache:${req.originalUrl}`;
  const cachedData = await redis.get(key);
  if (cachedData) {
    return res.json(JSON.parse(cachedData));
  }
  res.sendResponse = res.json;
  res.json = (body) => {
    redis.setex(key, duration, JSON.stringify(body));
    res.sendResponse(body);
  };
  next();
};

app.get('/api/search/suggestions', cache(300), async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json([]);
  
  try {
    const result = await db.query(
      `SELECT title, slug, cover 
       FROM mangas 
       WHERE title ILIKE $1 
       OR slug ILIKE $1
       OR unaccent(title) ILIKE unaccent($1)
       ORDER BY updated_at DESC 
       LIMIT 5`,
      [`%${q}%`]
    );
    res.json(result.rows);
  } catch (err) {
    logger.error('Suggestions Error', err);
    res.json([]);
  }
});

app.get('/api/mangas', async (req, res) => {
  const { page = 1, limit = 24, q, genre } = req.query;
  const offset = (page - 1) * limit;
  
  try {
    let whereClause = [];
    let params = [];
    let paramIndex = 1;

    if (q) {
      const qLower = q.trim();
      whereClause.push(`(title ILIKE $${paramIndex} OR slug ILIKE $${paramIndex} OR unaccent(title) ILIKE unaccent($${paramIndex}))`);
      params.push(`%${qLower}%`);
      paramIndex++;
    }

    if (genre) {
      whereClause.push(`$${paramIndex} = ANY(genres)`);
      params.push(genre);
      paramIndex++;
    }

    const whereStr = whereClause.length > 0 ? `WHERE ${whereClause.join(' AND ')}` : '';
    
    // Count first
    const countSql = `SELECT COUNT(*) FROM mangas ${whereStr}`;
    const countResult = await db.query(countSql, params);
    const total = parseInt(countResult.rows[0].count);

    // Data query
    const dataSql = `
      SELECT m.*, 
             (SELECT chapter_number FROM chapters WHERE manga_id = m.id ORDER BY chapter_number DESC LIMIT 1) as latest_chapter_number,
             (SELECT created_at FROM chapters WHERE manga_id = m.id ORDER BY chapter_number DESC LIMIT 1) as latest_chapter_at
      FROM mangas m
      ${whereStr}
      ORDER BY updated_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const result = await db.query(dataSql, [...params, limit, offset]);
    
    logger.info(`[SEARCH_API] Q: "${q}", Genre: "${genre}", Found: ${total}`);

    res.json({
      data: result.rows,
      total: total,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (err) {
    logger.error('API Error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/genres', cache(3600), async (req, res) => {
  try {
    const result = await db.query('SELECT DISTINCT unnest(genres) as name FROM mangas ORDER BY name ASC');
    res.json(result.rows.map(r => r.name));
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/mangas/:slug', cache(600), async (req, res) => {
  try {
    const mangaResult = await db.query('SELECT * FROM mangas WHERE slug = $1', [req.params.slug]);
    if (mangaResult.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    
    const manga = mangaResult.rows[0];
    const chapters = await db.query(
      'SELECT id, chapter_number, title, created_at FROM chapters WHERE manga_id = $1 ORDER BY chapter_number DESC',
      [manga.id]
    );
    
    // Check if followed by current user if token is provided
    let isFollowed = false;
    const authHeader = req.header('Authorization');
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const decoded = jwt.verify(token, JWT_SECRET || 'vibe-manga-secret-key-2026');
        const followCheck = await db.query(
          'SELECT 1 FROM follows WHERE user_id = $1 AND manga_id = $2',
          [decoded.id, manga.id]
        );
        isFollowed = followCheck.rows.length > 0;
      } catch (err) {
        // Ignore invalid token here
      }
    }
    
    res.json({ ...manga, chapters: chapters.rows, isFollowed });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/chapters/:id', cache(1800), async (req, res) => {
  try {
    const images = await db.query(
      'SELECT image_url, page_number FROM chapter_images WHERE chapter_id = $1 ORDER BY page_number ASC',
      [req.params.id]
    );
    
    // Also get context
    const chapter = await db.query('SELECT id, manga_id, chapter_number FROM chapters WHERE id = $1', [req.params.id]);
    if (chapter.rows.length === 0) {
      return res.status(404).json({ error: 'Chapter not found' });
    }
    const mangaId = chapter.rows[0].manga_id;
    
    const manga = await db.query('SELECT id, title, slug, cover FROM mangas WHERE id = $1', [mangaId]);
    const allChapters = await db.query(
      'SELECT id, chapter_number FROM chapters WHERE manga_id = $1 ORDER BY chapter_number ASC',
      [mangaId]
    );

    res.json({
      images: images.rows,
      manga: manga.rows[0],
      currentChapter: chapter.rows[0],
      allChapters: allChapters.rows
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.use('/api/image', imageProxy);

// ──────────────────────────────────────────────
// Admin: Backfill Telegram Cover IDs
// GET /api/admin/backfill-covers?secret=xxx&limit=50
// ──────────────────────────────────────────────
app.get('/api/admin/backfill-covers', async (req, res) => {
  const ADMIN_SECRET = process.env.ADMIN_SECRET || 'manga-admin-2026';
  if (req.query.secret !== ADMIN_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
  if (!BOT_TOKEN || !CHAT_ID) {
    return res.status(500).json({ error: 'Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID' });
  }

  const limit = parseInt(req.query.limit) || 30;
  const axios = require('axios');
  const FormData = require('form-data');

  // Stream response so client doesn't timeout
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.flushHeaders();

  const write = (msg) => { try { res.write(msg + '\n'); } catch(_) {} };

  try {
    const { rows } = await db.query(
      `SELECT id, title, cover FROM mangas 
       WHERE telegram_cover_id IS NULL AND cover IS NOT NULL 
       ORDER BY updated_at DESC LIMIT $1`,
      [limit]
    );

    write(`🔱 Found ${rows.length} mangas without Telegram cover (limit: ${limit})`);

    const referers = [
      'https://www.nettruyennew.com/',
      'https://nettruyenviet1.com/',
      'https://www.nettruyenmoi.com/',
    ];

    let success = 0, fail = 0;

    for (let i = 0; i < rows.length; i++) {
      const manga = rows[i];
      let imageBuffer = null;

      for (const referer of referers) {
        try {
          const r = await axios.get(manga.cover, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
              'Referer': referer,
              'Accept': 'image/*',
            },
            responseType: 'arraybuffer',
            timeout: 20000,
          });
          if (r.status === 200) { imageBuffer = Buffer.from(r.data); break; }
        } catch (_) {}
      }

      if (!imageBuffer) {
        write(`❌ [${i+1}/${rows.length}] Download failed: ${manga.title}`);
        fail++;
        continue;
      }

      try {
        const form = new FormData();
        form.append('chat_id', CHAT_ID);
        form.append('photo', imageBuffer, { filename: 'cover.jpg', contentType: 'image/jpeg' });

        const tgRes = await axios.post(
          `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`,
          form,
          { headers: form.getHeaders(), timeout: 30000 }
        );

        const photos = tgRes.data.result.photo;
        const fileId = photos[photos.length - 1].file_id;
        await db.query('UPDATE mangas SET telegram_cover_id = $1 WHERE id = $2', [fileId, manga.id]);

        write(`✅ [${i+1}/${rows.length}] ${manga.title}`);
        success++;
      } catch (err) {
        write(`❌ [${i+1}/${rows.length}] Telegram failed: ${manga.title} → ${err.message}`);
        fail++;
      }

      // Small delay to avoid Telegram rate limit
      await new Promise(r => setTimeout(r, 800));
    }

    write(`\n🏁 Done! Success: ${success} | Failed: ${fail}`);
  } catch (err) {
    write(`💥 Fatal: ${err.message}`);
  }

  res.end();
});

app.listen(PORT, () => {
  logger.info(`API Server running on port ${PORT}`);
});
