const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { updateAllPrices } = require('../jobs/priceUpdateJob');
const { stockIdeaOps } = require('../database');

// Manually trigger price update (admin only)
router.post('/update-prices', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log(`[Batch] Manual price update triggered by ${req.user.username}`);

    // Run price update in background
    updateAllPrices().catch(err => {
      console.error('[Batch] Price update error:', err);
    });

    res.json({
      message: 'Price update started',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Batch] Error:', error);
    res.status(500).json({ error: 'Failed to start price update' });
  }
});

// Get price update status
router.get('/update-status', authenticateToken, (req, res) => {
  try {
    const ideas = stockIdeaOps.getAll();

    // Get last update times
    const lastUpdates = ideas.map(idea => ({
      ticker: idea.ticker,
      lastUpdate: idea.updated_at
    }));

    res.json({
      totalIdeas: ideas.length,
      lastUpdates: lastUpdates.slice(0, 10), // Show last 10
      serverTime: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Batch] Error:', error);
    res.status(500).json({ error: 'Failed to get update status' });
  }
});

module.exports = router;
