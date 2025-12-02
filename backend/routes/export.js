const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { stockIdeaOps } = require('../database');
const { exportToCSV, exportToJSON, generateFilename } = require('../services/exportService');

// Export all ideas to CSV
router.get('/csv', authenticateToken, (req, res) => {
  try {
    const ideas = stockIdeaOps.getAll();
    const csv = exportToCSV(ideas);
    const filename = generateFilename('csv');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting to CSV:', error);
    res.status(500).json({ error: 'Failed to export to CSV' });
  }
});

// Export all ideas to JSON
router.get('/json', authenticateToken, (req, res) => {
  try {
    const ideas = stockIdeaOps.getAll();
    const json = exportToJSON(ideas);
    const filename = generateFilename('json');

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(json);
  } catch (error) {
    console.error('Error exporting to JSON:', error);
    res.status(500).json({ error: 'Failed to export to JSON' });
  }
});

// Export filtered ideas (POST with filter criteria)
router.post('/csv', authenticateToken, (req, res) => {
  try {
    const { tickers } = req.body;
    let ideas = stockIdeaOps.getAll();

    // Filter by tickers if provided
    if (tickers && tickers.length > 0) {
      ideas = ideas.filter(idea => tickers.includes(idea.ticker));
    }

    const csv = exportToCSV(ideas);
    const filename = generateFilename('csv');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting filtered CSV:', error);
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

module.exports = router;
