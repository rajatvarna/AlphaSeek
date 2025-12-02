const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const {
  commentOps,
  reactionOps,
  mentionOps,
  buildCommentTree
} = require('../services/commentsService');

// Get all comments for an idea (threaded)
router.get('/idea/:ideaId', authenticateToken, (req, res) => {
  try {
    const { ideaId } = req.params;
    const { flat } = req.query;

    const comments = commentOps.getByIdeaId(ideaId);

    // Return flat list or threaded tree
    if (flat === 'true') {
      res.json(comments);
    } else {
      const tree = buildCommentTree(comments);
      res.json(tree);
    }
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Get a single comment
router.get('/:commentId', authenticateToken, (req, res) => {
  try {
    const comment = commentOps.getById(req.params.commentId);

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    res.json(comment);
  } catch (error) {
    console.error('Error fetching comment:', error);
    res.status(500).json({ error: 'Failed to fetch comment' });
  }
});

// Create a new comment
router.post('/', authenticateToken, (req, res) => {
  try {
    const { ideaId, content, parentId } = req.body;

    if (!ideaId || !content) {
      return res.status(400).json({ error: 'ideaId and content are required' });
    }

    if (content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment cannot be empty' });
    }

    if (content.length > 5000) {
      return res.status(400).json({ error: 'Comment too long (max 5000 characters)' });
    }

    const commentId = commentOps.create(ideaId, req.user.id, content.trim(), parentId || null);

    // Extract and save @mentions
    mentionOps.extractAndSave(commentId, content);

    const newComment = commentOps.getById(commentId);
    res.status(201).json(newComment);
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

// Update a comment
router.patch('/:commentId', authenticateToken, (req, res) => {
  try {
    const { content } = req.body;
    const { commentId } = req.params;

    if (!content) {
      return res.status(400).json({ error: 'content is required' });
    }

    if (content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment cannot be empty' });
    }

    if (content.length > 5000) {
      return res.status(400).json({ error: 'Comment too long (max 5000 characters)' });
    }

    const success = commentOps.update(commentId, req.user.id, content.trim());

    if (!success) {
      return res.status(404).json({ error: 'Comment not found or unauthorized' });
    }

    const updatedComment = commentOps.getById(commentId);
    res.json(updatedComment);
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({ error: 'Failed to update comment' });
  }
});

// Delete a comment
router.delete('/:commentId', authenticateToken, (req, res) => {
  try {
    const { commentId } = req.params;
    const isAdmin = req.user.role === 'admin';

    const success = commentOps.delete(commentId, req.user.id, isAdmin);

    if (!success) {
      return res.status(404).json({ error: 'Comment not found or unauthorized' });
    }

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// Get replies to a comment
router.get('/:commentId/replies', authenticateToken, (req, res) => {
  try {
    const replies = commentOps.getReplies(req.params.commentId);
    res.json(replies);
  } catch (error) {
    console.error('Error fetching replies:', error);
    res.status(500).json({ error: 'Failed to fetch replies' });
  }
});

// Get comment count for an idea
router.get('/idea/:ideaId/count', authenticateToken, (req, res) => {
  try {
    const count = commentOps.getCount(req.params.ideaId);
    res.json({ count });
  } catch (error) {
    console.error('Error fetching comment count:', error);
    res.status(500).json({ error: 'Failed to fetch comment count' });
  }
});

// ========== REACTIONS ==========

// Get reactions for an idea
router.get('/reactions/idea/:ideaId', authenticateToken, (req, res) => {
  try {
    const { ideaId } = req.params;
    const reactions = reactionOps.getByIdeaId(ideaId);
    const summary = reactionOps.getSummary(ideaId);
    const userReaction = reactionOps.getUserReaction(ideaId, req.user.id);

    res.json({
      reactions,
      summary,
      userReaction
    });
  } catch (error) {
    console.error('Error fetching reactions:', error);
    res.status(500).json({ error: 'Failed to fetch reactions' });
  }
});

// Add/update a reaction
router.post('/reactions', authenticateToken, (req, res) => {
  try {
    const { ideaId, reactionType } = req.body;

    if (!ideaId || !reactionType) {
      return res.status(400).json({ error: 'ideaId and reactionType are required' });
    }

    if (!['bullish', 'bearish', 'watching'].includes(reactionType)) {
      return res.status(400).json({ error: 'Invalid reaction type' });
    }

    reactionOps.upsert(ideaId, req.user.id, reactionType);

    const summary = reactionOps.getSummary(ideaId);
    res.json({
      message: 'Reaction saved',
      summary,
      userReaction: reactionType
    });
  } catch (error) {
    console.error('Error saving reaction:', error);
    res.status(500).json({ error: 'Failed to save reaction' });
  }
});

// Remove a reaction
router.delete('/reactions/idea/:ideaId', authenticateToken, (req, res) => {
  try {
    const { ideaId } = req.params;

    const success = reactionOps.remove(ideaId, req.user.id);

    if (!success) {
      return res.status(404).json({ error: 'Reaction not found' });
    }

    const summary = reactionOps.getSummary(ideaId);
    res.json({
      message: 'Reaction removed',
      summary,
      userReaction: null
    });
  } catch (error) {
    console.error('Error removing reaction:', error);
    res.status(500).json({ error: 'Failed to remove reaction' });
  }
});

// ========== MENTIONS ==========

// Get mentions for current user
router.get('/mentions/me', authenticateToken, (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const mentions = mentionOps.getByUserId(req.user.id, parseInt(limit));
    res.json(mentions);
  } catch (error) {
    console.error('Error fetching mentions:', error);
    res.status(500).json({ error: 'Failed to fetch mentions' });
  }
});

module.exports = router;
