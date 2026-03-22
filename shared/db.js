const { Pool } = require('pg');
const dbUrl = process.env.DB_URL || process.env.DATABASE_URL;

const poolConfig = dbUrl 
  ? { 
      connectionString: dbUrl, 
      ssl: { 
        rejectUnauthorized: false 
      } 
    }
  : {
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'manga_db',
      password: process.env.DB_PASSWORD || 'postgres',
      port: process.env.DB_PORT || 5432,
    };

const pool = new Pool(poolConfig);

// Auto-migration for telegram_cover_id
if (dbUrl) {
  pool.query('ALTER TABLE mangas ADD COLUMN IF NOT EXISTS telegram_cover_id TEXT;').catch(err => {
    console.warn('Auto-migration for telegram_cover_id failed (might be expected if already exists):', err.message);
  });
}

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
