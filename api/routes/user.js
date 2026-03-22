const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const db = require('../../shared/db');

// Follow a manga
router.post('/follow/:mangaId', auth, async (req, res) => {
  try {
    await db.query(
      'INSERT INTO follows (user_id, manga_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.user.id, req.params.mangaId]
    );
    res.json({ success: true, message: 'Đã theo dõi truyện.' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi máy chủ.' });
  }
});

// Unfollow a manga
router.delete('/follow/:mangaId', auth, async (req, res) => {
  try {
    await db.query(
      'DELETE FROM follows WHERE user_id = $1 AND manga_id = $2',
      [req.user.id, req.params.mangaId]
    );
    res.json({ success: true, message: 'Đã bỏ theo dõi.' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi máy chủ.' });
  }
});

// Get user followed mangas
router.get('/follows', auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT m.*, 
              (SELECT chapter_number FROM chapters WHERE manga_id = m.id ORDER BY chapter_number DESC LIMIT 1) as latest_chapter_number,
              (SELECT created_at FROM chapters WHERE manga_id = m.id ORDER BY chapter_number DESC LIMIT 1) as latest_chapter_at
       FROM mangas m
       JOIN follows f ON f.manga_id = m.id
       WHERE f.user_id = $1
       ORDER BY m.updated_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi máy chủ.' });
  }
});

// Get notifications
router.get('/notifications', auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT n.*, m.title as manga_title, m.slug as manga_slug, c.chapter_number
       FROM notifications n
       JOIN mangas m ON m.id = n.manga_id
       JOIN chapters c ON c.id = n.chapter_id
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC
       LIMIT 50`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi máy chủ.' });
  }
});

// Mark notification as read
router.put('/notifications/:id/read', auth, async (req, res) => {
  try {
    await db.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi máy chủ.' });
  }
});

// Mark all notifications as read
router.put('/notifications/read-all', auth, async (req, res) => {
  try {
    await db.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = $1',
      [req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi máy chủ.' });
  }
});

module.exports = router;
