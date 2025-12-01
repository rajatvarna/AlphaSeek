const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

const dbPath = path.join(__dirname, 'alphaseek.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database schema
function initializeDatabase() {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'user')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Stock ideas table
  db.exec(`
    CREATE TABLE IF NOT EXISTS stock_ideas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticker TEXT NOT NULL,
      company_name TEXT NOT NULL,
      source TEXT NOT NULL,
      source_type TEXT NOT NULL CHECK(source_type IN ('Reddit', 'X', 'Hedge Fund', 'Blog', 'News', 'Other')),
      original_link TEXT,
      entry_date TEXT NOT NULL,
      entry_price REAL NOT NULL,
      current_price REAL NOT NULL,
      thesis TEXT NOT NULL,
      summary TEXT NOT NULL,
      conviction TEXT NOT NULL CHECK(conviction IN ('High', 'Medium', 'Low')),
      created_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // Tags table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    )
  `);

  // Stock ideas tags junction table
  db.exec(`
    CREATE TABLE IF NOT EXISTS stock_idea_tags (
      stock_idea_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (stock_idea_id, tag_id),
      FOREIGN KEY (stock_idea_id) REFERENCES stock_ideas(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    )
  `);

  // Price history cache table
  db.exec(`
    CREATE TABLE IF NOT EXISTS price_history_cache (
      ticker TEXT PRIMARY KEY,
      history_data TEXT NOT NULL,
      cached_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create indexes for better query performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_stock_ideas_ticker ON stock_ideas(ticker);
    CREATE INDEX IF NOT EXISTS idx_stock_ideas_source_type ON stock_ideas(source_type);
    CREATE INDEX IF NOT EXISTS idx_stock_ideas_created_at ON stock_ideas(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_price_history_ticker ON price_history_cache(ticker);
  `);

  // Create default admin user if no users exist (password: admin123)
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCount.count === 0) {
    const passwordHash = hashPassword('admin123');
    db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run(
      'admin',
      passwordHash,
      'admin'
    );
    console.log('✓ Default admin user created (username: admin, password: admin123)');
  }

  console.log('✓ Database initialized successfully');
}

// Helper function to hash passwords
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Helper function to verify password
function verifyPassword(password, hash) {
  return hashPassword(password) === hash;
}

// User operations
const userOps = {
  create: (username, password, role = 'user') => {
    const passwordHash = hashPassword(password);
    return db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run(
      username,
      passwordHash,
      role
    );
  },

  findByUsername: (username) => {
    return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  },

  findById: (id) => {
    return db.prepare('SELECT id, username, role, created_at FROM users WHERE id = ?').get(id);
  },

  authenticate: (username, password) => {
    const user = userOps.findByUsername(username);
    if (!user) return null;

    if (verifyPassword(password, user.password_hash)) {
      return { id: user.id, username: user.username, role: user.role };
    }
    return null;
  }
};

// Stock idea operations
const stockIdeaOps = {
  create: (ideaData, userId) => {
    const { ticker, companyName, source, sourceType, originalLink, entryDate, entryPrice, currentPrice, thesis, summary, conviction, tags } = ideaData;

    const result = db.prepare(`
      INSERT INTO stock_ideas (ticker, company_name, source, source_type, original_link, entry_date, entry_price, current_price, thesis, summary, conviction, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(ticker, companyName, source, sourceType, originalLink, entryDate, entryPrice, currentPrice, thesis, summary, conviction, userId);

    const ideaId = result.lastInsertRowid;

    // Add tags
    if (tags && tags.length > 0) {
      for (const tagName of tags) {
        // Insert tag if it doesn't exist
        db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)').run(tagName);
        const tag = db.prepare('SELECT id FROM tags WHERE name = ?').get(tagName);
        db.prepare('INSERT INTO stock_idea_tags (stock_idea_id, tag_id) VALUES (?, ?)').run(ideaId, tag.id);
      }
    }

    return ideaId;
  },

  getAll: () => {
    const ideas = db.prepare(`
      SELECT si.*, GROUP_CONCAT(t.name) as tags
      FROM stock_ideas si
      LEFT JOIN stock_idea_tags sit ON si.id = sit.stock_idea_id
      LEFT JOIN tags t ON sit.tag_id = t.id
      GROUP BY si.id
      ORDER BY si.created_at DESC
    `).all();

    return ideas.map(idea => ({
      ...idea,
      tags: idea.tags ? idea.tags.split(',') : []
    }));
  },

  getById: (id) => {
    const idea = db.prepare(`
      SELECT si.*, GROUP_CONCAT(t.name) as tags
      FROM stock_ideas si
      LEFT JOIN stock_idea_tags sit ON si.id = sit.stock_idea_id
      LEFT JOIN tags t ON sit.tag_id = t.id
      WHERE si.id = ?
      GROUP BY si.id
    `).get(id);

    if (!idea) return null;

    return {
      ...idea,
      tags: idea.tags ? idea.tags.split(',') : []
    };
  },

  update: (id, ideaData) => {
    const { ticker, companyName, source, sourceType, originalLink, entryDate, entryPrice, currentPrice, thesis, summary, conviction, tags } = ideaData;

    db.prepare(`
      UPDATE stock_ideas
      SET ticker = ?, company_name = ?, source = ?, source_type = ?, original_link = ?,
          entry_date = ?, entry_price = ?, current_price = ?, thesis = ?, summary = ?,
          conviction = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(ticker, companyName, source, sourceType, originalLink, entryDate, entryPrice, currentPrice, thesis, summary, conviction, id);

    // Update tags
    db.prepare('DELETE FROM stock_idea_tags WHERE stock_idea_id = ?').run(id);
    if (tags && tags.length > 0) {
      for (const tagName of tags) {
        db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)').run(tagName);
        const tag = db.prepare('SELECT id FROM tags WHERE name = ?').get(tagName);
        db.prepare('INSERT INTO stock_idea_tags (stock_idea_id, tag_id) VALUES (?, ?)').run(id, tag.id);
      }
    }

    return true;
  },

  updateCurrentPrice: (id, currentPrice) => {
    return db.prepare('UPDATE stock_ideas SET current_price = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(currentPrice, id);
  },

  delete: (id) => {
    return db.prepare('DELETE FROM stock_ideas WHERE id = ?').run(id);
  },

  getAllTags: () => {
    return db.prepare('SELECT DISTINCT name FROM tags ORDER BY name').all().map(t => t.name);
  }
};

// Price history cache operations
const priceHistoryOps = {
  get: (ticker) => {
    const cached = db.prepare('SELECT * FROM price_history_cache WHERE ticker = ?').get(ticker);
    if (!cached) return null;

    // Check if cache is older than 24 hours
    const cacheAge = Date.now() - new Date(cached.cached_at).getTime();
    const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

    if (cacheAge > CACHE_DURATION) {
      return null; // Cache expired
    }

    return JSON.parse(cached.history_data);
  },

  set: (ticker, historyData) => {
    const dataStr = JSON.stringify(historyData);
    return db.prepare('INSERT OR REPLACE INTO price_history_cache (ticker, history_data, cached_at) VALUES (?, ?, CURRENT_TIMESTAMP)').run(ticker, dataStr);
  }
};

module.exports = {
  db,
  initializeDatabase,
  userOps,
  stockIdeaOps,
  priceHistoryOps,
  hashPassword,
  verifyPassword
};
