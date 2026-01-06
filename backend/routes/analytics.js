const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  calculatePerformanceAttribution,
  calculateSectorAllocation,
  getPortfolioSummary
} = require('../services/analyticsService');

// Get performance attribution analytics
router.get('/performance', authenticateToken, (req, res) => {
  try {
    const attribution = calculatePerformanceAttribution();
    res.json(attribution);
  } catch (error) {
    console.error('Error calculating performance attribution:', error);
    res.status(500).json({ error: 'Failed to calculate performance attribution' });
  }
});

// Get sector allocation
router.get('/sectors', authenticateToken, (req, res) => {
  try {
    const allocation = calculateSectorAllocation();
    res.json(allocation);
  } catch (error) {
    console.error('Error calculating sector allocation:', error);
    res.status(500).json({ error: 'Failed to calculate sector allocation' });
  }
});

// Get portfolio summary
router.get('/summary', authenticateToken, (req, res) => {
  try {
    const summary = getPortfolioSummary();
    res.json(summary);
  } catch (error) {
    console.error('Error getting portfolio summary:', error);
    res.status(500).json({ error: 'Failed to get portfolio summary' });
  }
});

module.exports = router;
