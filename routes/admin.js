const express    = require('express');
const router     = express.Router();
const multer     = require('multer');
const path       = require('path');
const fs         = require('fs');
const { createClient } = require('@supabase/supabase-js');
const Post       = require('../models/Post');
const Donation   = require('../models/Donation');
const Volunteer  = require('../models/Volunteer');
const { requireAdmin, redirectIfAdmin } = require('../middleware/auth');

// ── Supabase Storage setup ───────────────────────────────
let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  // Create bucket if it doesn't exist yet (safe to call every startup)
  supabase.storage.createBucket('tipi-raisers', { public: true }).catch(() => {});
  console.log('[Storage] Supabase Storage ready');
} else {
  console.log('[Storage] No Supabase keys — using local disk fallback');
}

// ── Multer: memory for Supabase, disk for local ──────────
const ALLOWED = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const fileFilter = (req, file, cb) => {
  ALLOWED.includes(path.extname(file.originalname).toLowerCase())
    ? cb(null, true)
    : cb(new Error('Only image files are allowed (jpg, png, gif, webp).'));
};

let upload;
if (supabase) {
  upload = multer({ storage: multer.memoryStorage(), fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });
} else {
  const uploadDir = path.join(__dirname, '..', 'public', 'images', 'uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  upload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => cb(null, uploadDir),
      filename:    (req, file, cb) => cb(null, Date.now() + '-' + Math.round(Math.random() * 1e6) + path.extname(file.originalname).toLowerCase()),
    }),
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 },
  });
}

// Upload one file — returns its public URL
async function uploadFile(file) {
  if (supabase) {
    const ext  = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
    const { error } = await supabase.storage
      .from('tipi-raisers')
      .upload(name, file.buffer, { contentType: file.mimetype, upsert: false });
    if (error) throw new Error('Supabase upload failed: ' + error.message);
    return supabase.storage.from('tipi-raisers').getPublicUrl(name).data.publicUrl;
  }
  // Local fallback
  return '/images/uploads/' + file.filename;
}

// Upload all files in req.files, return URL array
async function uploadAll(files) {
  if (!files || files.length === 0) return [];
  return Promise.all(files.map(uploadFile));
}

// ── Login ────────────────────────────────────────────────
router.get('/login', redirectIfAdmin, (req, res) => {
  res.render('admin/login', { title: 'Admin Login', flash: req.flash() });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === (process.env.ADMIN_USERNAME || 'admin') &&
      password === (process.env.ADMIN_PASSWORD || 'changeme123')) {
    req.session.isAdmin   = true;
    req.session.adminUser = username;
    return req.session.save(err => {
      if (err) { req.flash('error', 'Login failed.'); return res.redirect('/admin/login'); }
      res.redirect('/admin');
    });
  }
  req.flash('error', 'Invalid credentials.');
  res.redirect('/admin/login');
});

router.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/'); });

// ── Dashboard ────────────────────────────────────────────
router.get('/', requireAdmin, async (req, res) => {
  try {
    const [posts, allDonations, allVolunteers, totalRaised] = await Promise.all([
      Post.findAll(), Donation.findAll(), Volunteer.findAll(), Donation.getTotalRaised(),
    ]);
    res.render('admin/dashboard', {
      title: 'Admin Dashboard', posts,
      donations:  allDonations.slice(0, 10),
      volunteers: allVolunteers.slice(0, 10),
      totalRaised, flash: req.flash(),
    });
  } catch (e) {
    console.error('Dashboard error:', e);
    res.render('admin/dashboard', {
      title: 'Admin Dashboard', posts: [], donations: [], volunteers: [], totalRaised: 0, flash: req.flash(),
    });
  }
});

// ── New Post ─────────────────────────────────────────────
router.get('/posts/new', requireAdmin, (req, res) => {
  res.render('admin/post-form', { title: 'New Post', post: null, flash: req.flash() });
});

router.post('/posts', requireAdmin, upload.array('imageFiles', 20), async (req, res) => {
  const { title, content, excerpt, category, status } = req.body;
  if (!title || !content) {
    req.flash('error', 'Title and content are required.');
    return res.redirect('/admin/posts/new');
  }
  try {
    const images   = await uploadAll(req.files);
    const imageUrl = images[0] || '';
    await Post.create({ title, content, excerpt, category, author: req.session.adminUser, imageUrl, images, status });
    req.flash('success', `Post "${title}" created successfully.`);
  } catch (e) {
    console.error('Post create error:', e);
    req.flash('error', 'Failed to create post: ' + e.message);
  }
  res.redirect('/admin');
});

// ── Edit Post ────────────────────────────────────────────
router.get('/posts/:id/edit', requireAdmin, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) { req.flash('error', 'Post not found.'); return res.redirect('/admin'); }
    res.render('admin/post-form', { title: 'Edit Post', post, flash: req.flash() });
  } catch (e) {
    req.flash('error', 'Could not load post.');
    res.redirect('/admin');
  }
});

router.post('/posts/:id', requireAdmin, upload.array('imageFiles', 20), async (req, res) => {
  const { title, content, excerpt, category, status } = req.body;
  try {
    const newUploads = await uploadAll(req.files);
    const kept = Array.isArray(req.body.existingImages)
      ? req.body.existingImages
      : req.body.existingImages ? [req.body.existingImages] : [];
    const images   = [...kept, ...newUploads];
    const imageUrl = images[0] || '';
    await Post.update(req.params.id, { title, content, excerpt, category, imageUrl, images, status });
    req.flash('success', 'Post updated.');
  } catch (e) {
    console.error('Post update error:', e);
    req.flash('error', 'Failed to update post: ' + e.message);
  }
  res.redirect('/admin');
});

// ── Delete Post ──────────────────────────────────────────
router.post('/posts/:id/delete', requireAdmin, async (req, res) => {
  try {
    await Post.delete(req.params.id);
    req.flash('success', 'Post deleted.');
  } catch (e) {
    req.flash('error', 'Failed to delete post.');
  }
  res.redirect('/admin');
});

module.exports = router;
