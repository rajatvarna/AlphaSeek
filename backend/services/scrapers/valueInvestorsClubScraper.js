const { extractTickers, analyzeSentiment, extractSummary } = require('./tickerExtractor');
const { db } = require('../../database');

// ValueInvestorsClub configuration
const VIC_CONFIG = {
  baseUrl: 'https://www.valueinvestorsclub.com',
  ideasUrl: 'https://www.valueinvestorsclub.com/ideas',
  requiresAuth: true,
  username: process.env.VIC_USERNAME || '',
  password: process.env.VIC_PASSWORD || ''
};

/**
 * Login to ValueInvestorsClub and get session cookie
 * Note: VIC requires membership - user must have valid credentials
 */
async function loginToVIC() {
  if (!VIC_CONFIG.username || !VIC_CONFIG.password) {
    console.warn('[VIC Scraper] VIC credentials not configured');
    console.warn('[VIC Scraper] Set VIC_USERNAME and VIC_PASSWORD in .env');
    console.warn('[VIC Scraper] Sign up at: https://www.valueinvestorsclub.com/');
    return null;
  }

  try {
    // Note: This is a simplified version. VIC's actual auth flow may be more complex
    // Users may need to implement session management based on VIC's current requirements
    console.log('[VIC Scraper] VIC scraping requires valid membership credentials');
    console.log('[VIC Scraper] VIC has restrictions on automated scraping - use responsibly');
    return null;
  } catch (error) {
    console.error('[VIC Scraper] Login failed:', error.message);
    return null;
  }
}

/**
 * Scrape public VIC ideas page (limited access without login)
 */
async function scrapePublicIdeas() {
  try {
    console.log('[VIC Scraper] Fetching public ideas...');

    const response = await fetch(VIC_CONFIG.ideasUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();

    // Parse ideas from HTML
    // Note: This is simplified - actual parsing depends on VIC's HTML structure
    const ideas = parseVICHTML(html);

    return ideas;
  } catch (error) {
    console.error('[VIC Scraper] Error fetching public ideas:', error.message);
    return [];
  }
}

/**
 * Parse VIC HTML to extract stock ideas
 * This is a basic implementation - may need updates based on VIC's structure
 */
function parseVICHTML(html) {
  const ideas = [];

  try {
    // Look for idea titles and tickers
    // VIC typically shows format like "TICKER - Company Name"
    const ideaRegex = /([A-Z]{1,5})\s*[-–]\s*([^<\n]+)/g;
    const matches = html.matchAll(ideaRegex);

    for (const match of matches) {
      const ticker = match[1];
      const title = match[2].trim();

      // Validate ticker
      if (ticker.length >= 1 && ticker.length <= 5 && /^[A-Z]+$/.test(ticker)) {
        ideas.push({
          ticker,
          title,
          source: 'ValueInvestorsClub',
          url: VIC_CONFIG.baseUrl
        });
      }
    }
  } catch (error) {
    console.error('[VIC Scraper] Error parsing HTML:', error.message);
  }

  return ideas;
}

/**
 * Alternative: Use VIC's RSS feed if available
 */
async function scrapeVICRSS() {
  try {
    // VIC may have RSS for recent ideas
    const rssUrl = 'https://www.valueinvestorsclub.com/feeds/ideas';

    const response = await fetch(rssUrl, {
      headers: {
        'User-Agent': 'AlphaSeek/1.0'
      }
    });

    if (!response.ok) {
      return [];
    }

    const xmlText = await response.text();

    // Simple RSS parsing
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    const matches = xmlText.matchAll(itemRegex);

    for (const match of matches) {
      const itemXml = match[1];

      const title = extractTag(itemXml, 'title');
      const link = extractTag(itemXml, 'link');
      const description = extractTag(itemXml, 'description');
      const pubDate = extractTag(itemXml, 'pubDate');

      if (title && link) {
        // Extract ticker from title (usually format: "TICKER - Company Name")
        const tickerMatch = title.match(/^([A-Z]{1,5})\s*[-–]/);
        if (tickerMatch) {
          items.push({
            ticker: tickerMatch[1],
            title: title.replace(/^[A-Z]{1,5}\s*[-–]\s*/, ''),
            description: cleanHTML(description),
            link,
            pubDate
          });
        }
      }
    }

    return items;
  } catch (error) {
    console.error('[VIC Scraper] Error fetching RSS:', error.message);
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
    .replace(/\s+/g, ' ')
    .trim();
}

async function scrapeAll() {
  console.log('[VIC Scraper] Starting scrape job...');
  const startTime = Date.now();

  let totalIdeas = 0;

  // Try RSS feed first (most reliable)
  try {
    const rssIdeas = await scrapeVICRSS();

    for (const item of rssIdeas) {
      try {
        // Check if already processed
        const urlHash = Buffer.from(item.link).toString('base64').substring(0, 50);
        const existing = db.prepare('SELECT id FROM scraped_ideas WHERE reddit_id = ?').get(`vic_${urlHash}`);
        if (existing) continue;

        const fullText = `${item.title} ${item.description}`;
        const sentiment = analyzeSentiment(fullText);
        const summary = extractSummary(item.description || item.title, 300);

        // VIC ideas are generally high quality
        const confidence = 0.7 + (sentiment.confidence * 0.3);

        const idea = {
          source: 'ValueInvestorsClub',
          source_type: 'Blog',
          reddit_id: `vic_${urlHash}`,
          title: item.title.substring(0, 250),
          body: summary,
          url: item.link,
          author: 'VIC Member',
          ticker: item.ticker,
          sentiment: sentiment.sentiment,
          sentiment_score: sentiment.score,
          confidence,
          upvotes: 0,
          num_comments: 0
        };

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

        totalIdeas++;
        console.log(`[VIC Scraper] Found ${item.ticker} (confidence: ${confidence.toFixed(2)})`);
      } catch (err) {
        if (!err.message.includes('UNIQUE constraint')) {
          console.error(`[VIC Scraper] Error saving idea:`, err.message);
        }
      }
    }
  } catch (error) {
    console.error('[VIC Scraper] Error in scraping process:', error.message);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`[VIC Scraper] Completed in ${duration}s - Found ${totalIdeas} new ideas`);

  return { success: true, ideasFound: totalIdeas };
}

module.exports = {
  scrapeAll,
  scrapeVICRSS,
  scrapePublicIdeas
};
