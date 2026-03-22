const { Pool } = require('../api/node_modules/pg');

const DB_URL = 'postgresql://neondb_owner:npg_3XHBsSTfay6P@ep-aged-pine-a1c0hey1-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

const migrate = async () => {
    const pool = new Pool({
        connectionString: DB_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('Running migration: Add telegram_cover_id to mangas...');
        await pool.query('ALTER TABLE mangas ADD COLUMN IF NOT EXISTS telegram_cover_id TEXT;');
        console.log('Success!');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err.message);
        process.exit(1);
    }
};

migrate();
