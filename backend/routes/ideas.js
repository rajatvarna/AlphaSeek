const express = require('express');
const router = express.Router();
const { stockIdeaOps } = require('../database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Get all stock ideas (public - all users can view)
router.get('/', authenticateToken, (req, res) => {
  try {
    const ideas = stockIdeaOps.getAll();
    res.json(ideas);
  } catch (error) {
    console.error('Error fetching ideas:', error);
    res.status(500).json({ error: 'Failed to fetch ideas' });
  }
});

// Get single stock idea by ID
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const idea = stockIdeaOps.getById(req.params.id);
    if (!idea) {
      return res.status(404).json({ error: 'Idea not found' });
    }
    res.json(idea);
  } catch (error) {
    console.error('Error fetching idea:', error);
    res.status(500).json({ error: 'Failed to fetch idea' });
  }
});

// Create new stock idea (admin only)
router.post('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { ticker, companyName, source, sourceType, originalLink, entryDate, entryPrice, currentPrice, thesis, summary, conviction, tags } = req.body;

    // Validation
    if (!ticker || !companyName || !source || !sourceType || !entryDate || !entryPrice || !currentPrice || !thesis || !summary || !conviction) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const ideaId = stockIdeaOps.create({
      ticker: ticker.toUpperCase(),
      companyName,
      source,
      sourceType,
      originalLink,
      entryDate,
      entryPrice,
      currentPrice,
      thesis,
      summary,
      conviction,
      tags: tags || []
    }, req.user.id);

    const newIdea = stockIdeaOps.getById(ideaId);
    res.status(201).json(newIdea);
  } catch (error) {
    console.error('Error creating idea:', error);
    res.status(500).json({ error: 'Failed to create idea' });
  }
});

// Update stock idea (admin only)
router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { ticker, companyName, source, sourceType, originalLink, entryDate, entryPrice, currentPrice, thesis, summary, conviction, tags } = req.body;

    const existingIdea = stockIdeaOps.getById(req.params.id);
    if (!existingIdea) {
      return res.status(404).json({ error: 'Idea not found' });
    }

    stockIdeaOps.update(req.params.id, {
      ticker: ticker.toUpperCase(),
      companyName,
      source,
      sourceType,
      originalLink,
      entryDate,
      entryPrice,
      currentPrice,
      thesis,
      summary,
      conviction,
      tags: tags || []
    });

    const updatedIdea = stockIdeaOps.getById(req.params.id);
    res.json(updatedIdea);
  } catch (error) {
    console.error('Error updating idea:', error);
    res.status(500).json({ error: 'Failed to update idea' });
  }
});

// Update current price only (admin only)
router.patch('/:id/price', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { currentPrice } = req.body;

    if (!currentPrice) {
      return res.status(400).json({ error: 'Current price required' });
    }

    stockIdeaOps.updateCurrentPrice(req.params.id, currentPrice);
    const updatedIdea = stockIdeaOps.getById(req.params.id);
    res.json(updatedIdea);
  } catch (error) {
    console.error('Error updating price:', error);
    res.status(500).json({ error: 'Failed to update price' });
  }
});

// Delete stock idea (admin only)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const existingIdea = stockIdeaOps.getById(req.params.id);
    if (!existingIdea) {
      return res.status(404).json({ error: 'Idea not found' });
    }

    stockIdeaOps.delete(req.params.id);
    res.json({ message: 'Idea deleted successfully' });
  } catch (error) {
    console.error('Error deleting idea:', error);
    res.status(500).json({ error: 'Failed to delete idea' });
  }
});

// Get all tags
router.get('/meta/tags', authenticateToken, (req, res) => {
  try {
    const tags = stockIdeaOps.getAllTags();
    res.json(tags);
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

module.exports = router;
