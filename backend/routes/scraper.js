const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { scrapeAll, getPendingIdeas, approveIdea, rejectIdea } = require('../services/scrapers/redditScraper');
const { stockIdeaOps } = require('../database');
const { db } = require('../database');

// Get pending scraped ideas (admin only)
router.get('/pending', authenticateToken, requireAdmin, (req, res) => {
  try {
    const pending = getPendingIdeas();
    res.json(pending);
  } catch (error) {
    console.error('Error fetching pending ideas:', error);
    res.status(500).json({ error: 'Failed to fetch pending ideas' });
  }
});

// Manually trigger scraping (admin only)
router.post('/scrape', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log(`[Scraper API] Manual scrape triggered by ${req.user.username}`);

    // Run scraper in background
    scrapeAll().catch(err => {
      console.error('[Scraper API] Scrape error:', err);
    });

    res.json({
      message: 'Scraping started',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error starting scrape:', error);
    res.status(500).json({ error: 'Failed to start scraping' });
  }
});

// Approve scraped idea and convert to stock idea (admin only)
router.post('/approve/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const scrapedIdea = db.prepare('SELECT * FROM scraped_ideas WHERE id = ?').get(req.params.id);

    if (!scrapedIdea) {
      return res.status(404).json({ error: 'Scraped idea not found' });
    }

    if (scrapedIdea.approved) {
      return res.status(400).json({ error: 'Idea already approved' });
    }

    // Get current price for the ticker
    const stockData = await require('../services/stocks').getStockData(scrapedIdea.ticker);
    const currentPrice = stockData?.currentPrice || 100;

    // Create stock idea
    const conviction = scrapedIdea.confidence > 0.7 ? 'High' : scrapedIdea.confidence > 0.4 ? 'Medium' : 'Low';

    const ideaId = stockIdeaOps.create({
      ticker: scrapedIdea.ticker,
      companyName: stockData?.companyName || `${scrapedIdea.ticker} Corp.`,
      source: scrapedIdea.source,
      sourceType: 'Reddit',
      originalLink: scrapedIdea.url,
      entryDate: new Date().toISOString().split('T')[0],
      entryPrice: currentPrice,
      currentPrice,
      thesis: scrapedIdea.body || scrapedIdea.title,
      summary: scrapedIdea.title.substring(0, 250),
      conviction,
      tags: [scrapedIdea.sentiment === 'bullish' ? 'Bullish' : 'Bearish', 'Reddit']
    }, req.user.id);

    // Mark as approved
    approveIdea(req.params.id);

    const newIdea = stockIdeaOps.getById(ideaId);
    res.status(201).json({
      message: 'Idea approved and created',
      idea: newIdea
    });
  } catch (error) {
    console.error('Error approving idea:', error);
    res.status(500).json({ error: 'Failed to approve idea' });
  }
});

// Reject scraped idea (admin only)
router.post('/reject/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const scrapedIdea = db.prepare('SELECT * FROM scraped_ideas WHERE id = ?').get(req.params.id);

    if (!scrapedIdea) {
      return res.status(404).json({ error: 'Scraped idea not found' });
    }

    rejectIdea(req.params.id);

    res.json({ message: 'Idea rejected' });
  } catch (error) {
    console.error('Error rejecting idea:', error);
    res.status(500).json({ error: 'Failed to reject idea' });
  }
});

// Get scraping stats
router.get('/stats', authenticateToken, (req, res) => {
  try {
    const stats = {
      pending: db.prepare('SELECT COUNT(*) as count FROM scraped_ideas WHERE approved = FALSE AND rejected = FALSE').get().count,
      approved: db.prepare('SELECT COUNT(*) as count FROM scraped_ideas WHERE approved = TRUE').get().count,
      rejected: db.prepare('SELECT COUNT(*) as count FROM scraped_ideas WHERE rejected = TRUE').get().count,
      total: db.prepare('SELECT COUNT(*) as count FROM scraped_ideas').get().count
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
