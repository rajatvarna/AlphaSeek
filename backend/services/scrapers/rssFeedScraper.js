const { extractTickers, analyzeSentiment, extractSummary } = require('./tickerExtractor');
const { db } = require('../../database');

// Popular finance blogs and newsletters with RSS feeds
const RSS_FEEDS = [
  // Substack newsletters
  {
    name: 'The Diff (Byrne Hobart)',
    url: 'https://diff.substack.com/feed',
    type: 'Substack',
    priority: 'high'
  },
  {
    name: 'Net Interest',
    url: 'https://www.netinterest.co/feed',
    type: 'Substack',
    priority: 'high'
  },
  {
    name: 'Stratechery',
    url: 'https://stratechery.com/feed/',
    type: 'Blog',
    priority: 'high'
  },
  // Seeking Alpha (RSS available for some sections)
  {
    name: 'Seeking Alpha - Market News',
    url: 'https://seekingalpha.com/feed.xml',
    type: 'Blog',
    priority: 'medium'
  },
  // Other finance blogs
  {
    name: 'A Wealth of Common Sense',
    url: 'https://awealthofcommonsense.com/feed/',
    type: 'Blog',
    priority: 'medium'
  },
  {
    name: 'Abnormal Returns',
    url: 'https://abnormalreturns.com/feed/',
    type: 'Blog',
    priority: 'medium'
  },
  {
    name: 'The Reformed Broker',
    url: 'https://thereformedbroker.com/feed/',
    type: 'Blog',
    priority: 'medium'
  },
  {
    name: 'Calculating Risk',
    url: 'https://www.calculatedriskblog.com/feeds/posts/default',
    type: 'Blog',
    priority: 'medium'
  },
  {
    name: 'Marginal Revolution',
    url: 'https://marginalrevolution.com/feed',
    type: 'Blog',
    priority: 'low'
  }
];

/**
 * Parse RSS/Atom XML feed
 */
function parseRSSFeed(xmlText) {
  try {
    // Simple XML parsing without external dependencies
    const items = [];

    // Match all <item> or <entry> tags (RSS vs Atom)
    const itemRegex = /<(?:item|entry)[^>]*>([\s\S]*?)<\/(?:item|entry)>/gi;
    const matches = xmlText.matchAll(itemRegex);

    for (const match of matches) {
      const itemXml = match[1];

      // Extract fields
      const title = extractXMLTag(itemXml, 'title');
      const link = extractXMLTag(itemXml, 'link') || extractXMLAttribute(itemXml, 'link', 'href');
      const description = extractXMLTag(itemXml, 'description') || extractXMLTag(itemXml, 'summary') || extractXMLTag(itemXml, 'content:encoded');
      const pubDate = extractXMLTag(itemXml, 'pubDate') || extractXMLTag(itemXml, 'published') || extractXMLTag(itemXml, 'updated');
      const author = extractXMLTag(itemXml, 'author') || extractXMLTag(itemXml, 'dc:creator');

      if (title && link) {
        items.push({
          title: cleanHTML(title),
          link: cleanHTML(link),
          description: cleanHTML(description),
          pubDate,
          author: cleanHTML(author)
        });
      }
    }

    return items;
  } catch (error) {
    console.error('[RSS Scraper] Error parsing feed:', error.message);
    return [];
  }
}

function extractXMLTag(xml, tagName) {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

function extractXMLAttribute(xml, tagName, attributeName) {
  const regex = new RegExp(`<${tagName}[^>]*${attributeName}=["']([^"']*)["']`, 'i');
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

async function fetchRSSFeed(feedUrl) {
  try {
    const response = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'AlphaSeek Stock Idea Aggregator/1.0',
        'Accept': 'application/rss+xml, application/xml, text/xml'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const xmlText = await response.text();
    return parseRSSFeed(xmlText);
  } catch (error) {
    console.error(`[RSS Scraper] Error fetching feed ${feedUrl}:`, error.message);
    return [];
  }
}

function calculateConfidence(sentimentConfidence, hasTicker, feedPriority) {
  let score = 0;

  // Sentiment confidence (0-0.4)
  score += sentimentConfidence * 0.4;

  // Has $ ticker format (0-0.3)
  if (hasTicker) score += 0.3;

  // Feed priority (0-0.3)
  if (feedPriority === 'high') score += 0.3;
  else if (feedPriority === 'medium') score += 0.2;
  else score += 0.1;

  return Math.min(score, 1);
}

async function scrapeFeed(feed) {
  try {
    console.log(`[RSS Scraper] Fetching ${feed.name}...`);

    const items = await fetchRSSFeed(feed.url);
    if (items.length === 0) {
      console.log(`[RSS Scraper] No items found in ${feed.name}`);
      return 0;
    }

    let ideasFound = 0;

    for (const item of items.slice(0, 20)) { // Process max 20 items per feed
      try {
        const fullText = `${item.title} ${item.description}`;

        // Check if already processed
        const urlHash = Buffer.from(item.link).toString('base64').substring(0, 50);
        const existing = db.prepare('SELECT id FROM scraped_ideas WHERE reddit_id = ?').get(`rss_${urlHash}`);
        if (existing) continue;

        // Extract tickers
        const tickers = extractTickers(fullText);
        if (tickers.length === 0) continue;

        // Analyze sentiment
        const sentiment = analyzeSentiment(fullText);

        // Check if has $ format (more reliable)
        const hasDollarFormat = fullText.includes('$');

        for (const ticker of tickers.slice(0, 2)) { // Max 2 tickers per article
          const summary = extractSummary(item.description || item.title, 300);

          const confidence = calculateConfidence(
            sentiment.confidence,
            hasDollarFormat,
            feed.priority
          );

          // Only save if confidence is reasonable
          if (confidence < 0.3) continue;

          const idea = {
            source: feed.name,
            source_type: feed.type,
            reddit_id: `rss_${urlHash}_${ticker}`,
            title: item.title.substring(0, 250),
            body: summary,
            url: item.link,
            author: item.author || feed.name,
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

            ideasFound++;
            console.log(`[RSS Scraper] Found ${ticker} in ${feed.name} (confidence: ${confidence.toFixed(2)})`);
          } catch (err) {
            if (!err.message.includes('UNIQUE constraint')) {
              console.error(`[RSS Scraper] Error saving idea:`, err.message);
            }
          }
        }
      } catch (error) {
        console.error(`[RSS Scraper] Error processing item:`, error.message);
      }
    }

    return ideasFound;
  } catch (error) {
    console.error(`[RSS Scraper] Error scraping ${feed.name}:`, error.message);
    return 0;
  }
}

async function scrapeAll() {
  console.log('[RSS Scraper] Starting scrape job...');
  const startTime = Date.now();

  let totalIdeas = 0;

  // Scrape high priority feeds first
  const highPriorityFeeds = RSS_FEEDS.filter(f => f.priority === 'high');
  for (const feed of highPriorityFeeds) {
    const ideas = await scrapeFeed(feed);
    totalIdeas += ideas;
    await new Promise(resolve => setTimeout(resolve, 2000)); // Delay between feeds
  }

  // Then medium priority
  const mediumPriorityFeeds = RSS_FEEDS.filter(f => f.priority === 'medium');
  for (const feed of mediumPriorityFeeds) {
    const ideas = await scrapeFeed(feed);
    totalIdeas += ideas;
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Finally low priority
  const lowPriorityFeeds = RSS_FEEDS.filter(f => f.priority === 'low');
  for (const feed of lowPriorityFeeds) {
    const ideas = await scrapeFeed(feed);
    totalIdeas += ideas;
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`[RSS Scraper] Completed in ${duration}s - Found ${totalIdeas} new ideas`);

  return { success: true, ideasFound: totalIdeas };
}

// Add a custom feed
function addCustomFeed(name, url, type = 'Blog', priority = 'medium') {
  RSS_FEEDS.push({ name, url, type, priority });
  console.log(`[RSS Scraper] Added custom feed: ${name}`);
}

module.exports = {
  scrapeAll,
  scrapeFeed,
  addCustomFeed,
  RSS_FEEDS
};
