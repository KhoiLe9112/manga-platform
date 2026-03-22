const db = require('../shared/db');

const migrate = async () => {
    try {
        console.log('Running migration: Add telegram_cover_id to mangas...');
        await db.query('ALTER TABLE mangas ADD COLUMN IF NOT EXISTS telegram_cover_id TEXT;');
        console.log('Success!');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err.message);
        process.exit(1);
    }
};

migrate();
