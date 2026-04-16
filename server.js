require('dotenv').config({ override: true });
const express      = require('express');
const session      = require('express-session');
const flash        = require('connect-flash');
const methodOverride = require('method-override');
const path         = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

app.set('trust proxy', 1);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));

app.use(session({
  secret:            process.env.SESSION_SECRET || 'tipi-raisers-secret-change-me',
  resave:            true,
  saveUninitialized: false,
  cookie: {
    secure:   isProd,   // true on Render (HTTPS), false locally (HTTP)
    httpOnly: true,
    maxAge:   1000 * 60 * 60 * 24, // 24 hours
  },
}));
app.use(flash());

// Global template variables
app.use((req, res, next) => {
  res.locals.siteName    = process.env.SITE_NAME || 'Tipi Raisers';
  res.locals.siteUrl     = process.env.SITE_URL  || 'http://localhost:3000';
  res.locals.isAdmin     = req.session && req.session.isAdmin;
  res.locals.currentPath = req.path;
  next();
});

app.use('/',            require('./routes/index'));
app.use('/blog',        require('./routes/blog'));
app.use('/donate',      require('./routes/donate'));
app.use('/get-involved', require('./routes/involve'));
app.use('/admin',       require('./routes/admin'));

// 404
app.use((req, res) => {
  res.status(404).render('404', { title: 'Page Not Found' });
});

// Error handler — also handles multer errors nicely
app.use((err, req, res, next) => {
  console.error(err.stack);
  // Multer file type error — redirect back with flash instead of full crash page
  if (err.code === 'LIMIT_FILE_SIZE') {
    req.flash('error', 'File too large. Maximum size is 10MB.');
    return res.redirect('back');
  }
  if (err.message && err.message.includes('image files')) {
    req.flash('error', err.message);
    return res.redirect('back');
  }
  res.status(500).render('500', { title: 'Server Error', error: isProd ? 'Something went wrong.' : err.message });
});

app.listen(PORT, '0.0.0.0', () => {
  const os   = require('os');
  const nets = os.networkInterfaces();
  let localIP = 'localhost';
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) { localIP = net.address; break; }
    }
  }
  console.log(`\n🏠 Tipi Raisers is running! (${isProd ? 'production' : 'development'})`);
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   Network: http://${localIP}:${PORT}`);
  console.log(`   Admin:   http://localhost:${PORT}/admin\n`);
});

module.exports = app;
