const express  = require('express');
const router   = express.Router();
const { marked } = require('marked');
const Post     = require('../models/Post');

const CATEGORIES = ['Progress Update','Community Stories','How to Help','News & Events','Construction Updates','Volunteer Spotlight'];
const PER_PAGE   = 6;

const SORT_OPTIONS = {
  newest: { label: 'Newest First', fn: (a, b) => new Date(b.createdAt) - new Date(a.createdAt) },
  oldest: { label: 'Oldest First', fn: (a, b) => new Date(a.createdAt) - new Date(b.createdAt) },
  az:     { label: 'A → Z',        fn: (a, b) => a.title.localeCompare(b.title) },
  za:     { label: 'Z → A',        fn: (a, b) => b.title.localeCompare(a.title) },
};

router.get('/', async (req, res) => {
  const { category, sort = 'newest' } = req.query;
  const page    = parseInt(req.query.page || 1);
  const sortKey = SORT_OPTIONS[sort] ? sort : 'newest';

  let posts = [];
  try {
    posts = category ? await Post.findByCategory(category) : await Post.findPublished();
    if (!Array.isArray(posts)) posts = [];
  } catch (e) { posts = []; }

  // Apply sort
  posts = [...posts].sort(SORT_OPTIONS[sortKey].fn);

  const totalPages     = Math.ceil(posts.length / PER_PAGE) || 1;
  const paginatedPosts = posts.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // Build base query string (without page) for sort/category links
  function buildQuery(overrides) {
    const params = { category, sort: sortKey, ...overrides };
    return Object.entries(params)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&');
  }

  res.render('blog', {
    title: 'Blog',
    posts: paginatedPosts,
    categories:      CATEGORIES,
    sortOptions:     SORT_OPTIONS,
    currentCategory: category || null,
    currentSort:     sortKey,
    currentPage:     page,
    totalPages,
    buildQuery,
    flash: req.flash(),
  });
});

router.get('/:slug', async (req, res) => {
  try {
    const post = await Post.findBySlug(req.params.slug);
    if (!post || post.status !== 'published') return res.status(404).render('404', { title: 'Post Not Found' });
    const htmlContent  = marked(post.content);
    const relatedPosts = (await Post.findByCategory(post.category)).filter(p => p.id !== post.id).slice(0, 3);
    res.render('post', { title: post.title, post, htmlContent, relatedPosts, flash: req.flash() });
  } catch (e) {
    res.status(500).render('500', { title: 'Server Error', error: e.message });
  }
});

module.exports = router;
