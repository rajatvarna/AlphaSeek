const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { fetchFundamentals } = require('../services/fundamentalsService');

// Get fundamental data for a ticker
router.get('/:ticker', authenticateToken, async (req, res) => {
  try {
    const ticker = req.params.ticker.toUpperCase();
    const fundamentals = await fetchFundamentals(ticker);

    if (!fundamentals) {
      return res.status(404).json({ error: 'Fundamental data not available' });
    }

    res.json(fundamentals);
  } catch (error) {
    console.error('Error fetching fundamentals:', error);
    res.status(500).json({ error: 'Failed to fetch fundamental data' });
  }
});

module.exports = router;
