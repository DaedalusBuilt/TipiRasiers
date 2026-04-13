/**
 * config/database.js — SQLite database setup via better-sqlite3
 *
 * Replaces the old JSON flat-file store.
 * Database file lives at /data/tipirasers.db
 *
 * TODO: For production on Render/Railway, set DB_PATH env var to a
 *       persistent volume path so the DB survives redeploys.
 *       e.g. DB_PATH=/var/data/tipirasers.db
 */

const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');

const DB_DIR  = path.join(__dirname, '..', 'data');
const DB_PATH = process.env.DB_PATH || path.join(DB_DIR, 'tipirasers.db');

if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Create Tables ─────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS posts (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    slug        TEXT UNIQUE NOT NULL,
    content     TEXT NOT NULL,
    excerpt     TEXT,
    category    TEXT,
    author      TEXT,
    image_url   TEXT DEFAULT '',
    status      TEXT DEFAULT 'draft',
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS donations (
    id              TEXT PRIMARY KEY,
    donor_name      TEXT NOT NULL,
    donor_email     TEXT NOT NULL,
    amount          REAL NOT NULL,
    message         TEXT DEFAULT '',
    payment_method  TEXT DEFAULT 'pending',
    transaction_id  TEXT,
    status          TEXT DEFAULT 'pending',
    created_at      TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS volunteers (
    id               TEXT PRIMARY KEY,
    name             TEXT NOT NULL,
    email            TEXT UNIQUE NOT NULL,
    phone            TEXT DEFAULT '',
    interests        TEXT DEFAULT '[]',
    skills           TEXT DEFAULT '',
    message          TEXT DEFAULT '',
    available_hours  TEXT DEFAULT '',
    status           TEXT DEFAULT 'pending',
    created_at       TEXT NOT NULL
  );
`);

module.exports = db;
