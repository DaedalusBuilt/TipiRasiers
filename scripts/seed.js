/**
 * scripts/seed.js — Seed starter blog posts into PostgreSQL
 * Run with: npm run seed
 */
require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const slugify        = require('slugify');
const db             = require('../config/database');

async function seed() {
  console.log('Seeding database...');

  const posts = [
    {
      title:    'Welcome to Tipi Raisers',
      content:  '## Our Mission\n\nThe Reservation Homes Project is building affordable, quality homes for Indigenous families by 2035.\n\nWe believe every family deserves a safe place to call home.',
      excerpt:  'The Reservation Homes Project is building affordable, quality homes for Indigenous families by 2035.',
      category: 'Progress Update',
      status:   'published',
    },
    {
      title:    'How You Can Help',
      content:  '## Ways to Get Involved\n\nThere are many ways to support the Tipi Raisers mission:\n\n- **Donate** — Every dollar goes directly to construction\n- **Volunteer** — Join a build crew on the reservation\n- **Spread the word** — Share our story with your community',
      excerpt:  'There are many ways to support the Tipi Raisers mission — donate, volunteer, or spread the word.',
      category: 'How to Help',
      status:   'published',
    },
  ];

  for (const p of posts) {
    const id  = uuidv4();
    const slug = slugify(p.title, { lower: true, strict: true });
    const now  = new Date().toISOString();
    await db.query(
      'INSERT INTO posts (id,title,slug,content,excerpt,category,author,image_url,images,status,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT (slug) DO NOTHING',
      [id, p.title, slug, p.content, p.excerpt, p.category, 'Admin', '', '[]', p.status, now, now]
    );
    console.log('  + ' + p.title);
  }

  console.log('Done!');
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
