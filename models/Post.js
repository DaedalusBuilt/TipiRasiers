/**
 * models/Post.js — Blog post model using SQLite
 */

const { v4: uuidv4 } = require('uuid');
const slugify        = require('slugify');
const db             = require('../config/database');

// Helper: convert DB row (snake_case) → JS object (camelCase)
function rowToPost(row) {
  if (!row) return null;
  return {
    id:        row.id,
    title:     row.title,
    slug:      row.slug,
    content:   row.content,
    excerpt:   row.excerpt,
    category:  row.category,
    author:    row.author,
    imageUrl:  row.image_url,
    status:    row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const Post = {
  // All posts, newest first
  findAll() {
    return db.prepare('SELECT * FROM posts ORDER BY created_at DESC').all().map(rowToPost);
  },

  // Published posts only
  findPublished() {
    return db.prepare("SELECT * FROM posts WHERE status = 'published' ORDER BY created_at DESC").all().map(rowToPost);
  },

  // By slug
  findBySlug(slug) {
    return rowToPost(db.prepare('SELECT * FROM posts WHERE slug = ?').get(slug));
  },

  // By ID
  findById(id) {
    return rowToPost(db.prepare('SELECT * FROM posts WHERE id = ?').get(id));
  },

  // By category (published only)
  findByCategory(category) {
    return db.prepare("SELECT * FROM posts WHERE category = ? AND status = 'published' ORDER BY created_at DESC")
      .all(category).map(rowToPost);
  },

  // Most recent N published posts
  findRecent(limit = 3) {
    return db.prepare("SELECT * FROM posts WHERE status = 'published' ORDER BY created_at DESC LIMIT ?")
      .all(limit).map(rowToPost);
  },

  // Create
  create({ title, content, excerpt, category, author, imageUrl = '', status = 'draft' }) {
    const id  = uuidv4();
    const slug = slugify(title, { lower: true, strict: true });
    const now  = new Date().toISOString();
    const exc  = excerpt || content.substring(0, 200) + '...';

    db.prepare(`
      INSERT INTO posts (id, title, slug, content, excerpt, category, author, image_url, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, title, slug, content, exc, category, author, imageUrl, status, now, now);

    return this.findById(id);
  },

  // Update
  update(id, { title, content, excerpt, category, imageUrl, status }) {
    const now     = new Date().toISOString();
    const current = this.findById(id);
    if (!current) return null;

    const newSlug = title ? slugify(title, { lower: true, strict: true }) : current.slug;

    db.prepare(`
      UPDATE posts SET
        title      = COALESCE(?, title),
        slug       = ?,
        content    = COALESCE(?, content),
        excerpt    = COALESCE(?, excerpt),
        category   = COALESCE(?, category),
        image_url  = COALESCE(?, image_url),
        status     = COALESCE(?, status),
        updated_at = ?
      WHERE id = ?
    `).run(title, newSlug, content, excerpt, category, imageUrl, status, now, id);

    return this.findById(id);
  },

  // Delete
  delete(id) {
    const result = db.prepare('DELETE FROM posts WHERE id = ?').run(id);
    return result.changes > 0;
  },
};

module.exports = Post;
