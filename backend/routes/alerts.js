const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { db } = require('../database');

// Initialize alerts table
db.exec(`
  CREATE TABLE IF NOT EXISTS price_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    stock_idea_id INTEGER NOT NULL,
    alert_type TEXT NOT NULL CHECK(alert_type IN ('price_target', 'percent_change', 'trailing_stop')),
    threshold REAL NOT NULL,
    triggered BOOLEAN DEFAULT FALSE,
    triggered_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (stock_idea_id) REFERENCES stock_ideas(id) ON DELETE CASCADE
  )
`);

// Get all alerts for current user
router.get('/', authenticateToken, (req, res) => {
  try {
    const alerts = db.prepare(`
      SELECT a.*, si.ticker, si.company_name, si.current_price
      FROM price_alerts a
      JOIN stock_ideas si ON a.stock_idea_id = si.id
      WHERE a.user_id = ?
      ORDER BY a.created_at DESC
    `).all(req.user.id);

    res.json(alerts);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// Create new alert
router.post('/', authenticateToken, (req, res) => {
  try {
    const { stock_idea_id, alert_type, threshold } = req.body;

    if (!stock_idea_id || !alert_type || threshold === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = db.prepare(`
      INSERT INTO price_alerts (user_id, stock_idea_id, alert_type, threshold)
      VALUES (?, ?, ?, ?)
    `).run(req.user.id, stock_idea_id, alert_type, threshold);

    const newAlert = db.prepare(`
      SELECT a.*, si.ticker, si.company_name, si.current_price
      FROM price_alerts a
      JOIN stock_ideas si ON a.stock_idea_id = si.id
      WHERE a.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(newAlert);
  } catch (error) {
    console.error('Error creating alert:', error);
    res.status(500).json({ error: 'Failed to create alert' });
  }
});

// Delete alert
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const result = db.prepare('DELETE FROM price_alerts WHERE id = ? AND user_id = ?').run(
      req.params.id,
      req.user.id
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json({ message: 'Alert deleted' });
  } catch (error) {
    console.error('Error deleting alert:', error);
    res.status(500).json({ error: 'Failed to delete alert' });
  }
});

module.exports = router;
