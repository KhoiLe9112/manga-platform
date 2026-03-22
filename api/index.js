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

app.listen(PORT, () => {
  logger.info(`API Server running on port ${PORT}`);
});
