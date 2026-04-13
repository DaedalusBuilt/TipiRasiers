/**
 * scripts/migrate.js — Import existing JSON data into SQLite
 * Run once with: node scripts/migrate.js
 */

require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const db   = require('../config/database');

const DATA_DIR = path.join(__dirname, '..', 'data');

function loadJSON(file) {
  const p = path.join(DATA_DIR, file);
  if (!fs.existsSync(p)) return [];
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch { return []; }
}

// ── Migrate Posts ─────────────────────────────────────────
const posts = loadJSON('posts.json');
const insertPost = db.prepare(`
  INSERT OR IGNORE INTO posts (id, title, slug, content, excerpt, category, author, image_url, status, created_at, updated_at)
  VALUES (@id, @title, @slug, @content, @excerpt, @category, @author, @imageUrl, @status, @createdAt, @updatedAt)
`);
const migratePosts = db.transaction((posts) => {
  for (const p of posts) insertPost.run({
    id: p.id, title: p.title, slug: p.slug, content: p.content,
    excerpt: p.excerpt || '', category: p.category || '', author: p.author || '',
    imageUrl: p.imageUrl || '', status: p.status || 'draft',
    createdAt: p.createdAt, updatedAt: p.updatedAt || p.createdAt,
  });
});
migratePosts(posts);
console.log(`✅ Migrated ${posts.length} posts`);

// ── Migrate Donations ─────────────────────────────────────
const donations = loadJSON('donations.json');
const insertDonation = db.prepare(`
  INSERT OR IGNORE INTO donations (id, donor_name, donor_email, amount, message, payment_method, transaction_id, status, created_at)
  VALUES (@id, @donorName, @donorEmail, @amount, @message, @paymentMethod, @transactionId, @status, @createdAt)
`);
const migrateDonations = db.transaction((donations) => {
  for (const d of donations) insertDonation.run({
    id: d.id, donorName: d.donorName, donorEmail: d.donorEmail,
    amount: d.amount, message: d.message || '',
    paymentMethod: d.paymentMethod || 'pending',
    transactionId: d.transactionId || null,
    status: d.status || 'pending', createdAt: d.createdAt,
  });
});
migrateDonations(donations);
console.log(`✅ Migrated ${donations.length} donations`);

// ── Migrate Volunteers ────────────────────────────────────
const volunteers = loadJSON('volunteers.json');
const insertVol = db.prepare(`
  INSERT OR IGNORE INTO volunteers (id, name, email, phone, interests, skills, message, available_hours, status, created_at)
  VALUES (@id, @name, @email, @phone, @interests, @skills, @message, @availableHours, @status, @createdAt)
`);
const migrateVolunteers = db.transaction((volunteers) => {
  for (const v of volunteers) insertVol.run({
    id: v.id, name: v.name, email: v.email, phone: v.phone || '',
    interests: JSON.stringify(v.interests || []),
    skills: v.skills || '', message: v.message || '',
    availableHours: v.availableHours || '',
    status: v.status || 'pending', createdAt: v.createdAt,
  });
});
migrateVolunteers(volunteers);
console.log(`✅ Migrated ${volunteers.length} volunteers`);

console.log('\n🎉 Migration complete! Your data is now in SQLite.');
console.log(`   Database: ${path.join(__dirname, '..', 'data', 'tipirasers.db')}\n`);
