const express = require('express');
const cors = require('cors');
const path = require('path');
const { initializeDatabase } = require('./database');
const { initializeScheduler } = require('./jobs/scheduler');
const { initializeEmailService } = require('./services/emailService');

// Initialize database
initializeDatabase();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/ideas', require('./routes/ideas'));
app.use('/api/stocks', require('./routes/stocks'));
app.use('/api/batch', require('./routes/batch'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/scraper', require('./routes/scraper'));
app.use('/api/export', require('./routes/export'));
app.use('/api/fundamentals', require('./routes/fundamentals'));
app.use('/api/comments', require('./routes/comments'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'AlphaSeek API is running' });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, async () => {
  console.log(`\n✓ AlphaSeek API server running on port ${PORT}`);
  console.log(`✓ API available at http://localhost:${PORT}/api`);
  console.log(`\nDefault credentials:`);
  console.log(`  Username: admin`);
  console.log(`  Password: admin123\n`);

  // Initialize email service
  await initializeEmailService();

  // Initialize background jobs after server starts
  initializeScheduler();
});

module.exports = app;
