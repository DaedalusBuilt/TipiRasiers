/**
 * routes/admin.js — Admin dashboard for managing posts, volunteers, donations
 * 
 * TODO: Add proper authentication (JWT, Passport.js, or OAuth)
 * TODO: Add role-based access control (super admin vs editor)
 * TODO: Add image upload via multer to public/images/uploads/
 */

const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const Donation = require('../models/Donation');
const Volunteer = require('../models/Volunteer');
const { requireAdmin, redirectIfAdmin } = require('../middleware/auth');

// ── Login ────────────────────────────────────────────────
router.get('/login', redirectIfAdmin, (req, res) => {
  res.render('admin/login', { title: 'Admin Login', flash: req.flash() });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const adminUser = process.env.ADMIN_USERNAME || 'admin';
  const adminPass = process.env.ADMIN_PASSWORD || 'changeme123';

  // TODO: Replace with real user lookup from database
  if (username === adminUser && password === adminPass) {
    req.session.isAdmin = true;
    req.session.adminUser = username;
    // Explicitly save session before redirect — fixes proxy (localtunnel/ngrok) session loss
    return req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
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
  const posts = Post.findAll();
  const donations = Donation.findAll().slice(0, 10);
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

// ── Create Post ──────────────────────────────────────────
router.post('/posts', requireAdmin, (req, res) => {
  const { title, content, excerpt, category, imageUrl, status } = req.body;
  if (!title || !content) {
    req.flash('error', 'Title and content are required.');
    return res.redirect('/admin/posts/new');
  }
  Post.create({ title, content, excerpt, category, author: "Tipi Raisers Team", imageUrl, status });
  req.flash('success', `Post "${title}" created successfully.`);
  res.redirect('/admin');
});

// ── Edit Post Form ───────────────────────────────────────
router.get('/posts/:id/edit', requireAdmin, (req, res) => {
  const post = Post.findById(req.params.id);
  if (!post) { req.flash('error', 'Post not found.'); return res.redirect('/admin'); }
  res.render('admin/post-form', { title: 'Edit Post', post, flash: req.flash() });
});

// ── Update Post ──────────────────────────────────────────
router.post('/posts/:id', requireAdmin, (req, res) => {
  const { title, content, excerpt, category, imageUrl, status } = req.body;
  Post.update(req.params.id, { title, content, excerpt, category, imageUrl, status });
  req.flash('success', 'Post updated.');
  res.redirect('/admin');
});

// ── Delete Post ──────────────────────────────────────────
router.post('/posts/:id/delete', requireAdmin, (req, res) => {
  Post.delete(req.params.id);
  req.flash('success', 'Post deleted.');
  res.redirect('/admin');
});

module.exports = router;
