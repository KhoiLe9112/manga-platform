-- Database Schema for Production-Grade Manga Platform
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Mangas table
CREATE TABLE IF NOT EXISTS mangas (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    author TEXT,
    description TEXT,
    cover TEXT,
    status TEXT,
    genres TEXT[],
    source_url TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    search_vector tsvector -- For Full-Text Search
);

-- Index for slug
CREATE INDEX IF NOT EXISTS idx_mangas_slug ON mangas(slug);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_mangas_search_vector ON mangas USING GIN(search_vector);

-- Trigger to update search_vector
CREATE OR REPLACE FUNCTION mangas_search_vector_update() RETURNS trigger AS $$
BEGIN
  new.search_vector := to_tsvector('simple', COALESCE(new.title, '')) || 
                       to_tsvector('simple', unaccent(COALESCE(new.title, '')));
  RETURN new;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_mangas_search_vector_update BEFORE INSERT OR UPDATE
ON mangas FOR EACH ROW EXECUTE FUNCTION mangas_search_vector_update();

-- Chapters table
CREATE TABLE IF NOT EXISTS chapters (
    id SERIAL PRIMARY KEY,
    manga_id INTEGER REFERENCES mangas(id) ON DELETE CASCADE,
    chapter_number FLOAT NOT NULL,
    title TEXT,
    source_url TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(manga_id, chapter_number)
);

-- Index for manga_id
CREATE INDEX IF NOT EXISTS idx_chapters_manga_id ON chapters(manga_id);

-- Chapter Images table
CREATE TABLE IF NOT EXISTS chapter_images (
    id SERIAL PRIMARY KEY,
    chapter_id INTEGER REFERENCES chapters(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    page_number INTEGER NOT NULL,
    UNIQUE(chapter_id, page_number)
);

-- Index for chapter_id
CREATE INDEX IF NOT EXISTS idx_chapter_images_chapter_id ON chapter_images(chapter_id);

-- Add telegram_file_id to chapter_images if not exists
ALTER TABLE chapter_images ADD COLUMN IF NOT EXISTS telegram_file_id TEXT;

-- Trigger to sync manga updated_at when a new chapter is added
CREATE OR REPLACE FUNCTION sync_manga_updated_at() RETURNS trigger AS $$
BEGIN
  UPDATE mangas SET updated_at = NOW() WHERE id = NEW.manga_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tg_sync_manga_updated_at ON chapters;
CREATE TRIGGER tg_sync_manga_updated_at AFTER INSERT ON chapters
FOR EACH ROW EXECUTE FUNCTION sync_manga_updated_at();
-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Follows table (Web)
CREATE TABLE IF NOT EXISTS follows (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    manga_id INTEGER REFERENCES mangas(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, manga_id)
);

-- Telegram Subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id SERIAL PRIMARY KEY,
    manga_id INTEGER REFERENCES mangas(id) ON DELETE CASCADE,
    telegram_chat_id BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(manga_id, telegram_chat_id)
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    manga_id INTEGER REFERENCES mangas(id) ON DELETE CASCADE,
    chapter_id INTEGER REFERENCES chapters(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trigger to create notifications for followers
CREATE OR REPLACE FUNCTION create_notifications_for_followers() RETURNS trigger AS $$
BEGIN
    INSERT INTO notifications (user_id, manga_id, chapter_id)
    SELECT user_id, manga_id, NEW.id
    FROM follows
    WHERE manga_id = NEW.manga_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_create_notifications_for_followers
AFTER INSERT ON chapters
FOR EACH ROW
EXECUTE FUNCTION create_notifications_for_followers();
