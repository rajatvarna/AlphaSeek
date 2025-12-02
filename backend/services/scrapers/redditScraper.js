const snoowrap = require('snoowrap');
const { extractTickers, analyzeSentiment, extractSummary } = require('./tickerExtractor');
const { db } = require('../../database');

// Reddit API credentials (user should set these in .env)
const REDDIT_CONFIG = {
  userAgent: process.env.REDDIT_USER_AGENT || 'AlphaSeek Stock Idea Scraper v1.0',
  clientId: process.env.REDDIT_CLIENT_ID || '',
  clientSecret: process.env.REDDIT_CLIENT_SECRET || '',
  refreshToken: process.env.REDDIT_REFRESH_TOKEN || ''
};

// Subreddits to monitor
const SUBREDDITS = ['wallstreetbets', 'stocks', 'investing', 'StockMarket', 'ValueInvesting'];

// Initialize scraped ideas table
db.exec(`
  CREATE TABLE IF NOT EXISTS scraped_ideas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL,
    source_type TEXT DEFAULT 'Reddit',
    reddit_id TEXT UNIQUE,
    title TEXT NOT NULL,
    body TEXT,
    url TEXT NOT NULL,
    author TEXT,
    ticker TEXT NOT NULL,
    sentiment TEXT,
    sentiment_score REAL,
    confidence REAL,
    upvotes INTEGER DEFAULT 0,
    num_comments INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    approved BOOLEAN DEFAULT FALSE,
    rejected BOOLEAN DEFAULT FALSE,
    processed_at DATETIME
  )
`);

async function initRedditClient() {
  if (!REDDIT_CONFIG.clientId || !REDDIT_CONFIG.clientSecret) {
    console.warn('[Reddit Scraper] Reddit credentials not configured');
    console.warn('[Reddit Scraper] Set REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_REFRESH_TOKEN in .env');
    return null;
  }

  try {
    const reddit = new snoowrap(REDDIT_CONFIG);
    // Test connection
    await reddit.getMe();
    console.log('[Reddit Scraper] Successfully connected to Reddit API');
    return reddit;
  } catch (error) {
    console.error('[Reddit Scraper] Failed to connect to Reddit:', error.message);
    return null;
  }
}

async function scrapeSubreddit(reddit, subreddit, limit = 10) {
  try {
    console.log(`[Reddit Scraper] Scraping r/${subreddit}...`);

    // Get hot posts
    const posts = await reddit.getSubreddit(subreddit).getHot({ limit });

    const scrapedIdeas = [];

    for (const post of posts) {
      try {
        // Skip if already processed
        const existing = db.prepare('SELECT id FROM scraped_ideas WHERE reddit_id = ?').get(post.id);
        if (existing) continue;

        const text = `${post.title} ${post.selftext || ''}`;

        // Extract tickers
        const tickers = extractTickers(text);
        if (tickers.length === 0) continue;

        // Analyze sentiment
        const sentiment = analyzeSentiment(text);

        // For each ticker found, create a scraped idea
        for (const ticker of tickers.slice(0, 3)) { // Max 3 tickers per post
          const summary = extractSummary(post.selftext || post.title, 250);

          const confidence = calculateConfidence(
            sentiment.confidence,
            post.score || 0,
            post.num_comments || 0
          );

          // Only save if confidence is reasonable
          if (confidence < 0.3) continue;

          const idea = {
            source: `r/${subreddit}`,
            source_type: 'Reddit',
            reddit_id: `${post.id}_${ticker}`,
            title: post.title,
            body: post.selftext || '',
            url: `https://reddit.com${post.permalink}`,
            author: post.author.name,
            ticker,
            sentiment: sentiment.sentiment,
            sentiment_score: sentiment.score,
            confidence,
            upvotes: post.score || 0,
            num_comments: post.num_comments || 0
          };

          try {
            db.prepare(`
              INSERT INTO scraped_ideas (
                source, source_type, reddit_id, title, body, url, author,
                ticker, sentiment, sentiment_score, confidence, upvotes, num_comments
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              idea.source, idea.source_type, idea.reddit_id, idea.title, idea.body,
              idea.url, idea.author, idea.ticker, idea.sentiment, idea.sentiment_score,
              idea.confidence, idea.upvotes, idea.num_comments
            );

            scrapedIdeas.push(idea);
            console.log(`[Reddit Scraper] Found ${ticker} in r/${subreddit} (confidence: ${confidence.toFixed(2)})`);
          } catch (err) {
            if (!err.message.includes('UNIQUE constraint')) {
              console.error(`[Reddit Scraper] Error saving idea:`, err.message);
            }
          }
        }
      } catch (error) {
        console.error(`[Reddit Scraper] Error processing post:`, error.message);
      }
    }

    return scrapedIdeas;
  } catch (error) {
    console.error(`[Reddit Scraper] Error scraping r/${subreddit}:`, error.message);
    return [];
  }
}

function calculateConfidence(sentimentConfidence, upvotes, numComments) {
  let score = 0;

  // Sentiment confidence (0-0.4)
  score += sentimentConfidence * 0.4;

  // Upvotes (0-0.3)
  if (upvotes > 100) score += 0.3;
  else if (upvotes > 50) score += 0.2;
  else if (upvotes > 10) score += 0.1;

  // Comments indicate engagement (0-0.3)
  if (numComments > 50) score += 0.3;
  else if (numComments > 20) score += 0.2;
  else if (numComments > 5) score += 0.1;

  return Math.min(score, 1);
}

async function scrapeAll() {
  console.log('[Reddit Scraper] Starting scrape job...');
  const startTime = Date.now();

  const reddit = await initRedditClient();
  if (!reddit) {
    console.log('[Reddit Scraper] Skipping - Reddit API not configured');
    return { success: false, ideasFound: 0 };
  }

  let totalIdeas = 0;

  for (const subreddit of SUBREDDITS) {
    const ideas = await scrapeSubreddit(reddit, subreddit, 25);
    totalIdeas += ideas.length;

    // Small delay between subreddits to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`[Reddit Scraper] Completed in ${duration}s - Found ${totalIdeas} new ideas`);

  return { success: true, ideasFound: totalIdeas };
}

// Get all pending scraped ideas for approval
function getPendingIdeas() {
  return db.prepare(`
    SELECT * FROM scraped_ideas
    WHERE approved = FALSE AND rejected = FALSE
    ORDER BY confidence DESC, upvotes DESC
    LIMIT 50
  `).all();
}

// Approve a scraped idea
function approveIdea(id) {
  return db.prepare('UPDATE scraped_ideas SET approved = TRUE, processed_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
}

// Reject a scraped idea
function rejectIdea(id) {
  return db.prepare('UPDATE scraped_ideas SET rejected = TRUE, processed_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
}

module.exports = {
  scrapeAll,
  scrapeSubreddit,
  getPendingIdeas,
  approveIdea,
  rejectIdea,
  initRedditClient
};
