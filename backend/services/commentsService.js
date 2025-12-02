const { db } = require('../database');

// Create comments table with threading support
db.exec(`
  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    idea_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    parent_id INTEGER,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    edited BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
  )
`);

// Create reactions table
db.exec(`
  CREATE TABLE IF NOT EXISTS reactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    idea_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    reaction_type TEXT NOT NULL CHECK(reaction_type IN ('bullish', 'bearish', 'watching')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(idea_id, user_id)
  )
`);

// Create mentions table for @mentions support
db.exec(`
  CREATE TABLE IF NOT EXISTS mentions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    comment_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

// Comment operations
const commentOps = {
  // Create a new comment
  create: (ideaId, userId, content, parentId = null) => {
    const stmt = db.prepare(`
      INSERT INTO comments (idea_id, user_id, content, parent_id)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(ideaId, userId, content, parentId);
    return result.lastInsertRowid;
  },

  // Get all comments for an idea (with user info)
  getByIdeaId: (ideaId) => {
    const stmt = db.prepare(`
      SELECT
        c.id,
        c.idea_id,
        c.user_id,
        c.parent_id,
        c.content,
        c.created_at,
        c.updated_at,
        c.edited,
        u.username,
        u.role
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.idea_id = ?
      ORDER BY c.created_at ASC
    `);
    return stmt.all(ideaId);
  },

  // Get a single comment by ID
  getById: (commentId) => {
    const stmt = db.prepare(`
      SELECT
        c.id,
        c.idea_id,
        c.user_id,
        c.parent_id,
        c.content,
        c.created_at,
        c.updated_at,
        c.edited,
        u.username,
        u.role
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `);
    return stmt.get(commentId);
  },

  // Update a comment
  update: (commentId, userId, content) => {
    const stmt = db.prepare(`
      UPDATE comments
      SET content = ?, updated_at = CURRENT_TIMESTAMP, edited = TRUE
      WHERE id = ? AND user_id = ?
    `);
    const result = stmt.run(content, commentId, userId);
    return result.changes > 0;
  },

  // Delete a comment
  delete: (commentId, userId, isAdmin = false) => {
    const stmt = isAdmin
      ? db.prepare('DELETE FROM comments WHERE id = ?')
      : db.prepare('DELETE FROM comments WHERE id = ? AND user_id = ?');

    const result = isAdmin
      ? stmt.run(commentId)
      : stmt.run(commentId, userId);

    return result.changes > 0;
  },

  // Get comment count for an idea
  getCount: (ideaId) => {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count FROM comments WHERE idea_id = ?
    `);
    return stmt.get(ideaId).count;
  },

  // Get replies to a comment
  getReplies: (parentId) => {
    const stmt = db.prepare(`
      SELECT
        c.id,
        c.idea_id,
        c.user_id,
        c.parent_id,
        c.content,
        c.created_at,
        c.updated_at,
        c.edited,
        u.username,
        u.role
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.parent_id = ?
      ORDER BY c.created_at ASC
    `);
    return stmt.all(parentId);
  }
};

// Reaction operations
const reactionOps = {
  // Add or update a reaction
  upsert: (ideaId, userId, reactionType) => {
    const stmt = db.prepare(`
      INSERT INTO reactions (idea_id, user_id, reaction_type)
      VALUES (?, ?, ?)
      ON CONFLICT(idea_id, user_id)
      DO UPDATE SET reaction_type = excluded.reaction_type, created_at = CURRENT_TIMESTAMP
    `);
    const result = stmt.run(ideaId, userId, reactionType);
    return result.lastInsertRowid || result.changes > 0;
  },

  // Remove a reaction
  remove: (ideaId, userId) => {
    const stmt = db.prepare(`
      DELETE FROM reactions WHERE idea_id = ? AND user_id = ?
    `);
    const result = stmt.run(ideaId, userId);
    return result.changes > 0;
  },

  // Get all reactions for an idea
  getByIdeaId: (ideaId) => {
    const stmt = db.prepare(`
      SELECT
        r.id,
        r.idea_id,
        r.user_id,
        r.reaction_type,
        r.created_at,
        u.username
      FROM reactions r
      JOIN users u ON r.user_id = u.id
      WHERE r.idea_id = ?
      ORDER BY r.created_at DESC
    `);
    return stmt.all(ideaId);
  },

  // Get reaction summary for an idea
  getSummary: (ideaId) => {
    const stmt = db.prepare(`
      SELECT
        reaction_type,
        COUNT(*) as count
      FROM reactions
      WHERE idea_id = ?
      GROUP BY reaction_type
    `);
    const rows = stmt.all(ideaId);

    const summary = {
      bullish: 0,
      bearish: 0,
      watching: 0,
      total: 0
    };

    rows.forEach(row => {
      summary[row.reaction_type] = row.count;
      summary.total += row.count;
    });

    return summary;
  },

  // Get user's reaction for an idea
  getUserReaction: (ideaId, userId) => {
    const stmt = db.prepare(`
      SELECT reaction_type FROM reactions WHERE idea_id = ? AND user_id = ?
    `);
    const result = stmt.get(ideaId, userId);
    return result ? result.reaction_type : null;
  }
};

// Mention operations
const mentionOps = {
  // Extract @mentions from content and save them
  extractAndSave: (commentId, content) => {
    const mentionPattern = /@(\w+)/g;
    const matches = content.match(mentionPattern);

    if (!matches) return [];

    const usernames = matches.map(m => m.substring(1));
    const mentionedUserIds = [];

    usernames.forEach(username => {
      const user = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
      if (user) {
        db.prepare(`
          INSERT OR IGNORE INTO mentions (comment_id, user_id)
          VALUES (?, ?)
        `).run(commentId, user.id);
        mentionedUserIds.push(user.id);
      }
    });

    return mentionedUserIds;
  },

  // Get mentions for a user
  getByUserId: (userId, limit = 20) => {
    const stmt = db.prepare(`
      SELECT
        m.id,
        m.comment_id,
        m.created_at,
        c.content,
        c.idea_id,
        u.username as mentioned_by
      FROM mentions m
      JOIN comments c ON m.comment_id = c.id
      JOIN users u ON c.user_id = u.id
      WHERE m.user_id = ?
      ORDER BY m.created_at DESC
      LIMIT ?
    `);
    return stmt.all(userId, limit);
  }
};

// Thread building helper
function buildCommentTree(comments) {
  const commentMap = new Map();
  const roots = [];

  // First pass: create map and initialize children arrays
  comments.forEach(comment => {
    commentMap.set(comment.id, { ...comment, children: [] });
  });

  // Second pass: build tree structure
  comments.forEach(comment => {
    const node = commentMap.get(comment.id);
    if (comment.parent_id === null) {
      roots.push(node);
    } else {
      const parent = commentMap.get(comment.parent_id);
      if (parent) {
        parent.children.push(node);
      }
    }
  });

  return roots;
}

module.exports = {
  commentOps,
  reactionOps,
  mentionOps,
  buildCommentTree
};
