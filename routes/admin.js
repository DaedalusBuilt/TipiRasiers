/**
 * routes/admin.js — Admin dashboard for managing posts, volunteers, donations
 * 
 * TODO: Add proper authentication (JWT, Passport.js, or OAuth)
 * TODO: Add role-based access control (super admin vs editor)
 * NOTE: On Render, uploaded files are ephemeral (wiped on redeploy).
 *       For permanent uploads, swap localStorage in multer for Cloudinary or S3.
 *       See: https://cloudinary.com/documentation/node_integration
 */

const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const Post     = require('../models/Post');
const Donation = require('../models/Donation');
const Volunteer = require('../models/Volunteer');
const { requireAdmin, redirectIfAdmin } = require('../middleware/auth');
const { syncDatabase } = require('../services/githubSync');


// ── Multer file upload config ────────────────────────────
const uploadDir = path.join(__dirname, '..', 'public', 'images', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const name = Date.now() + '-' + Math.round(Math.random() * 1e6) + ext;
    cb(null, name);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error('Only image files (jpg, png, gif, webp) are allowed.'));
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB max

// ── Login ────────────────────────────────────────────────
router.get('/login', redirectIfAdmin, (req, res) => {
  res.render('admin/login', { title: 'Admin Login', flash: req.flash() });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const adminUser = process.env.ADMIN_USERNAME || 'admin';
  const adminPass = process.env.ADMIN_PASSWORD || 'changeme123';

  if (username === adminUser && password === adminPass) {
    req.session.isAdmin = true;
    req.session.adminUser = username;
    return req.session.save((err) => {
      if (err) {
        req.flash('error', 'Login failed. Please try again.');
        return res.redirect('/admin/login');
      }
      res.redirect('/admin');
    });
  }
  req.flash('error', 'Invalid credentials. Check your username and password.');
  res.redirect('/admin/login');
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// ── Dashboard ────────────────────────────────────────────
router.get('/', requireAdmin, (req, res) => {
  const posts      = Post.findAll();
  const donations  = Donation.findAll().slice(0, 10);
  const volunteers = Volunteer.findAll().slice(0, 10);
  const totalRaised = Donation.getTotalRaised();
  res.render('admin/dashboard', {
    title: 'Admin Dashboard',
    posts, donations, volunteers, totalRaised,
    flash: req.flash(),
  });
});

// ── New Post Form ────────────────────────────────────────
router.get('/posts/new', requireAdmin, (req, res) => {
  res.render('admin/post-form', { title: 'New Post', post: null, flash: req.flash() });
});

// ── Create Post (with optional image upload) ─────────────
router.post('/posts', requireAdmin, upload.single('imageFile'), (req, res) => {
  const { title, content, excerpt, category, imageUrl, status } = req.body;
  if (!title || !content) {
    req.flash('error', 'Title and content are required.');
    return res.redirect('/admin/posts/new');
  }
  // Uploaded file takes priority over URL field
  const finalImageUrl = req.file
    ? '/images/uploads/' + req.file.filename
    : imageUrl || '';

  Post.create({ title, content, excerpt, category, author: req.session.adminUser, imageUrl: finalImageUrl, status });
  req.flash('success', `Post "${title}" created successfully.`);
  syncDatabase(`post: create "${title}"`); // push DB to GitHub in background
  res.redirect('/admin');
  console.log("[DB] Creating post:", title);
});

// ── Edit Post Form ───────────────────────────────────────
router.get('/posts/:id/edit', requireAdmin, (req, res) => {
  const post = Post.findById(req.params.id);
  if (!post) { req.flash('error', 'Post not found.'); return res.redirect('/admin'); }
  res.render('admin/post-form', { title: 'Edit Post', post, flash: req.flash() });
});

// ── Update Post (with optional image upload) ─────────────
router.post('/posts/:id', requireAdmin, upload.single('imageFile'), (req, res) => {
  const { title, content, excerpt, category, imageUrl, status } = req.body;
  const finalImageUrl = req.file
    ? '/images/uploads/' + req.file.filename
    : imageUrl || '';

  Post.update(req.params.id, { title, content, excerpt, category, imageUrl: finalImageUrl, status });
  req.flash('success', 'Post updated.');
  syncDatabase(`post: update "${title}"`); // push DB to GitHub in background
  res.redirect('/admin');
});

// ── Delete Post ──────────────────────────────────────────
router.post('/posts/:id/delete', requireAdmin, (req, res) => {
  Post.delete(req.params.id);
  req.flash('success', 'Post deleted.');
  syncDatabase('post: delete'); // push DB to GitHub in background
  res.redirect('/admin');
});

module.exports = router;
