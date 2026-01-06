const express = require('express');
const router = express.Router();
const { stockIdeaOps } = require('../database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { getEarningsData, getEarningsCalendar } = require('../services/earningsService');

// Get earnings data for a specific idea
router.get('/idea/:id', authenticateToken, async (req, res) => {
  try {
    const idea = stockIdeaOps.getById(req.params.id);
    if (!idea) {
      return res.status(404).json({ error: 'Idea not found' });
    }

    const earningsData = await getEarningsData(idea.ticker);

    if (!earningsData) {
      return res.json({
        ticker: idea.ticker,
        companyName: idea.company_name,
        hasEarnings: false,
        message: 'No earnings data available'
      });
    }

    res.json({
      ticker: idea.ticker,
      companyName: idea.company_name,
      hasEarnings: true,
      ...earningsData
    });
  } catch (error) {
    console.error('Error fetching earnings data:', error);
    res.status(500).json({ error: 'Failed to fetch earnings data' });
  }
});

// Get earnings calendar for all active ideas
router.get('/calendar', authenticateToken, async (req, res) => {
  try {
    const ideas = stockIdeaOps.getAll();
    const activeTickers = ideas
      .filter(idea => idea.status === 'Active')
      .map(idea => idea.ticker);

    if (activeTickers.length === 0) {
      return res.json({ calendar: [] });
    }

    const calendar = await getEarningsCalendar(activeTickers);

    res.json({ calendar });
  } catch (error) {
    console.error('Error fetching earnings calendar:', error);
    res.status(500).json({ error: 'Failed to fetch earnings calendar' });
  }
});

// Get upcoming earnings (within N days)
router.get('/upcoming', authenticateToken, async (req, res) => {
  try {
    const withinDays = parseInt(req.query.days) || 30;
    const upcoming = stockIdeaOps.getUpcomingEarnings(withinDays);

    res.json({ upcoming });
  } catch (error) {
    console.error('Error fetching upcoming earnings:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming earnings' });
  }
});

// Update earnings data for a specific idea (admin only)
router.post('/idea/:id/refresh', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const idea = stockIdeaOps.getById(req.params.id);
    if (!idea) {
      return res.status(404).json({ error: 'Idea not found' });
    }

    const earningsData = await getEarningsData(idea.ticker);

    if (!earningsData) {
      return res.json({
        success: false,
        message: 'No earnings data available for this ticker'
      });
    }

    // Update database with earnings data
    stockIdeaOps.updateEarnings(
      req.params.id,
      earningsData.nextEarningsDate || null,
      earningsData.nextEarningsDateRaw || null,
      earningsData.estimatedEPS || null
    );

    const updatedIdea = stockIdeaOps.getById(req.params.id);

    res.json({
      success: true,
      idea: updatedIdea,
      earningsData
    });
  } catch (error) {
    console.error('Error refreshing earnings data:', error);
    res.status(500).json({ error: 'Failed to refresh earnings data' });
  }
});

// Bulk refresh earnings for all active ideas (admin only)
router.post('/refresh-all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const ideas = stockIdeaOps.getAll();
    const activeIdeas = ideas.filter(idea => idea.status === 'Active');

    let updated = 0;
    let failed = 0;

    for (const idea of activeIdeas) {
      try {
        const earningsData = await getEarningsData(idea.ticker);

        if (earningsData && earningsData.nextEarningsDate) {
          stockIdeaOps.updateEarnings(
            idea.id,
            earningsData.nextEarningsDate,
            earningsData.nextEarningsDateRaw,
            earningsData.estimatedEPS || null
          );
          updated++;
        }
      } catch (error) {
        console.error(`Failed to update earnings for ${idea.ticker}:`, error.message);
        failed++;
      }

      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    res.json({
      success: true,
      total: activeIdeas.length,
      updated,
      failed,
      message: `Updated earnings for ${updated} ideas, ${failed} failed`
    });
  } catch (error) {
    console.error('Error bulk refreshing earnings:', error);
    res.status(500).json({ error: 'Failed to bulk refresh earnings' });
  }
});

module.exports = router;
