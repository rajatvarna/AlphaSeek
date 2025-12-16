const { extractTickers, analyzeSentiment, extractSummary } = require('./tickerExtractor');
const { db } = require('../../database');

/**
 * Google News Scraper - searches Google News for stock-related articles
 * Uses Google News RSS feeds which are publicly available
 */

// Stock-related search queries
const SEARCH_QUERIES = [
  'stock analysis',
  'stock picks 2025',
  'undervalued stocks',
  'value investing',
  'growth stocks',
  'dividend stocks',
  'tech stocks',
  'small cap stocks'
];

// Additional specific finance sites to search
const FINANCE_SITES = [
  'seekingalpha.com',
  'fool.com',
  'marketwatch.com',
  'bloomberg.com',
  'forbes.com/investing',
  'barrons.com',
  'investors.com'
];

/**
 * Fetch Google News RSS feed for a query
 */
async function fetchGoogleNews(query, maxResults = 10) {
  try {
    // Google News RSS URL format
    const encodedQuery = encodeURIComponent(query);
    const rssUrl = `https://news.google.com/rss/search?q=${encodedQuery}&hl=en-US&gl=US&ceid=US:en`;

    const response = await fetch(rssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const xmlText = await response.text();
    return parseGoogleNewsRSS(xmlText, maxResults);
  } catch (error) {
    console.error(`[Google News] Error fetching news for "${query}":`, error.message);
    return [];
  }
}

/**
 * Parse Google News RSS XML
 */
function parseGoogleNewsRSS(xmlText, maxResults) {
  const items = [];

  try {
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    const matches = Array.from(xmlText.matchAll(itemRegex)).slice(0, maxResults);

    for (const match of matches) {
      const itemXml = match[1];

      const title = extractTag(itemXml, 'title');
      const link = extractTag(itemXml, 'link');
      const description = extractTag(itemXml, 'description');
      const pubDate = extractTag(itemXml, 'pubDate');
      const source = extractTag(itemXml, 'source');

      if (title && link) {
        items.push({
          title: cleanHTML(title),
          link: cleanHTML(link),
          description: cleanHTML(description),
          pubDate,
          source: cleanHTML(source) || 'Google News'
        });
      }
    }
  } catch (error) {
    console.error('[Google News] Error parsing RSS:', error.message);
  }

  return items;
}

/**
 * Search finance sites via Google News
 */
async function searchFinanceSite(site, maxResults = 5) {
  try {
    const query = `site:${site} stock`;
    return await fetchGoogleNews(query, maxResults);
  } catch (error) {
    console.error(`[Google News] Error searching ${site}:`, error.message);
    return [];
  }
}

function extractTag(xml, tagName) {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

function cleanHTML(text) {
  if (!text) return '';
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function calculateConfidence(sentimentConfidence, hasTicker, sourceQuality) {
  let score = 0;

  // Sentiment confidence (0-0.4)
  score += sentimentConfidence * 0.4;

  // Has $ ticker format (0-0.3)
  if (hasTicker) score += 0.3;

  // Source quality (0-0.3)
  const highQualitySources = ['Bloomberg', 'MarketWatch', 'Barron', 'Seeking Alpha', 'Forbes'];
  if (highQualitySources.some(s => sourceQuality.includes(s))) {
    score += 0.3;
  } else {
    score += 0.15;
  }

  return Math.min(score, 1);
}

async function processNewsArticle(article, sourceType = 'News') {
  try {
    const fullText = `${article.title} ${article.description}`;

    // Check if already processed
    const urlHash = Buffer.from(article.link).toString('base64').substring(0, 50);
    const existing = db.prepare('SELECT id FROM scraped_ideas WHERE reddit_id = ?').get(`gnews_${urlHash}`);
    if (existing) return 0;

    // Extract tickers
    const tickers = extractTickers(fullText);
    if (tickers.length === 0) return 0;

    // Analyze sentiment
    const sentiment = analyzeSentiment(fullText);
    const hasDollarFormat = fullText.includes('$');

    let ideasCreated = 0;

    for (const ticker of tickers.slice(0, 2)) { // Max 2 tickers per article
      const summary = extractSummary(article.description || article.title, 300);

      const confidence = calculateConfidence(
        sentiment.confidence,
        hasDollarFormat,
        article.source
      );

      // Only save if confidence is reasonable
      if (confidence < 0.3) continue;

      const idea = {
        source: article.source,
        source_type: sourceType,
        reddit_id: `gnews_${urlHash}_${ticker}`,
        title: article.title.substring(0, 250),
        body: summary,
        url: article.link,
        author: article.source,
        ticker,
        sentiment: sentiment.sentiment,
        sentiment_score: sentiment.score,
        confidence,
        upvotes: 0,
        num_comments: 0
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

        ideasCreated++;
        console.log(`[Google News] Found ${ticker} from ${article.source} (confidence: ${confidence.toFixed(2)})`);
      } catch (err) {
        if (!err.message.includes('UNIQUE constraint')) {
          console.error(`[Google News] Error saving idea:`, err.message);
        }
      }
    }

    return ideasCreated;
  } catch (error) {
    console.error('[Google News] Error processing article:', error.message);
    return 0;
  }
}

async function scrapeAll() {
  console.log('[Google News Scraper] Starting scrape job...');
  const startTime = Date.now();

  let totalIdeas = 0;

  // Search general stock queries
  for (const query of SEARCH_QUERIES) {
    try {
      console.log(`[Google News] Searching for "${query}"...`);

      const articles = await fetchGoogleNews(query, 10);

      for (const article of articles) {
        const ideas = await processNewsArticle(article, 'News');
        totalIdeas += ideas;
      }

      // Delay to be respectful
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`[Google News] Error with query "${query}":`, error.message);
    }
  }

  // Search specific finance sites
  for (const site of FINANCE_SITES.slice(0, 3)) { // Limit to 3 sites per run
    try {
      console.log(`[Google News] Searching ${site}...`);

      const articles = await searchFinanceSite(site, 5);

      for (const article of articles) {
        const ideas = await processNewsArticle(article, 'Blog');
        totalIdeas += ideas;
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`[Google News] Error with site ${site}:`, error.message);
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`[Google News Scraper] Completed in ${duration}s - Found ${totalIdeas} new ideas`);

  return { success: true, ideasFound: totalIdeas };
}

module.exports = {
  scrapeAll,
  fetchGoogleNews,
  searchFinanceSite,
  processNewsArticle
};
