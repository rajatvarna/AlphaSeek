/**
 * News Service - Fetches real-time news for specific stock tickers
 * Uses multiple sources: Yahoo Finance, Google News RSS, and Benzinga RSS
 */

/**
 * Fetch news for a specific ticker from Yahoo Finance
 */
async function fetchYahooFinanceNews(ticker, limit = 10) {
  try {
    const url = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${ticker}&region=US&lang=en-US`;
    const response = await fetch(url);
    const xmlText = await response.text();

    const articles = parseRSSFeed(xmlText);
    return articles.slice(0, limit).map(article => ({
      ...article,
      source: 'Yahoo Finance',
      ticker: ticker.toUpperCase()
    }));
  } catch (error) {
    console.error(`Error fetching Yahoo Finance news for ${ticker}:`, error.message);
    return [];
  }
}

/**
 * Fetch news from Google News RSS for a specific ticker
 */
async function fetchGoogleNews(ticker, companyName, limit = 10) {
  try {
    // Search for both ticker and company name for better results
    const searchQuery = companyName ? `${ticker} OR "${companyName}"` : ticker;
    const encodedQuery = encodeURIComponent(searchQuery + ' stock');
    const url = `https://news.google.com/rss/search?q=${encodedQuery}&hl=en-US&gl=US&ceid=US:en`;

    const response = await fetch(url);
    const xmlText = await response.text();

    const articles = parseRSSFeed(xmlText);
    return articles.slice(0, limit).map(article => ({
      ...article,
      source: 'Google News',
      ticker: ticker.toUpperCase()
    }));
  } catch (error) {
    console.error(`Error fetching Google News for ${ticker}:`, error.message);
    return [];
  }
}

/**
 * Fetch news from Benzinga RSS feed
 */
async function fetchBenzingaNews(ticker, limit = 10) {
  try {
    const url = `https://www.benzinga.com/feed?q=${ticker}`;
    const response = await fetch(url);
    const xmlText = await response.text();

    const articles = parseRSSFeed(xmlText);
    return articles.slice(0, limit).map(article => ({
      ...article,
      source: 'Benzinga',
      ticker: ticker.toUpperCase()
    }));
  } catch (error) {
    console.error(`Error fetching Benzinga news for ${ticker}:`, error.message);
    return [];
  }
}

/**
 * Parse RSS feed XML into structured articles
 */
function parseRSSFeed(xmlText) {
  const articles = [];

  // Match all <item> or <entry> elements
  const itemRegex = /<(?:item|entry)[^>]*>([\s\S]*?)<\/(?:item|entry)>/gi;
  const matches = xmlText.matchAll(itemRegex);

  for (const match of matches) {
    const itemXml = match[1];

    const title = extractXMLTag(itemXml, 'title');
    const link = extractXMLTag(itemXml, 'link');
    const description = extractXMLTag(itemXml, 'description') || extractXMLTag(itemXml, 'summary');
    const pubDate = extractXMLTag(itemXml, 'pubDate') || extractXMLTag(itemXml, 'published');

    if (title && link) {
      articles.push({
        title: cleanHTMLEntities(title),
        link: link.includes('http') ? link : extractXMLTag(itemXml, 'link', 'href'),
        description: cleanHTMLEntities(stripHTML(description)),
        pubDate: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString()
      });
    }
  }

  return articles;
}

/**
 * Extract content from XML tag
 */
function extractXMLTag(xml, tagName, attribute = null) {
  if (attribute) {
    const attrRegex = new RegExp(`<${tagName}[^>]*${attribute}=["']([^"']+)["']`, 'i');
    const match = xml.match(attrRegex);
    return match ? match[1] : '';
  }

  const regex = new RegExp(`<${tagName}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\/${tagName}>`, 'i');
  let match = xml.match(regex);
  if (match) return match[1];

  const simpleRegex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\/${tagName}>`, 'i');
  match = xml.match(simpleRegex);
  return match ? match[1].trim() : '';
}

/**
 * Strip HTML tags from text
 */
function stripHTML(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').trim();
}

/**
 * Clean HTML entities
 */
function cleanHTMLEntities(text) {
  if (!text) return '';
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

/**
 * Fetch aggregated news from multiple sources for a ticker
 */
async function fetchTickerNews(ticker, companyName = null, limit = 20) {
  try {
    console.log(`Fetching news for ${ticker}...`);

    // Fetch from all sources in parallel
    const [yahooNews, googleNews, benzingaNews] = await Promise.all([
      fetchYahooFinanceNews(ticker, Math.ceil(limit / 2)),
      fetchGoogleNews(ticker, companyName, Math.ceil(limit / 2)),
      fetchBenzingaNews(ticker, Math.ceil(limit / 3))
    ]);

    // Combine and deduplicate articles
    const allArticles = [...yahooNews, ...googleNews, ...benzingaNews];

    // Remove duplicates based on title similarity
    const uniqueArticles = removeDuplicateArticles(allArticles);

    // Sort by publish date (newest first)
    uniqueArticles.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    return uniqueArticles.slice(0, limit);
  } catch (error) {
    console.error(`Error fetching news for ${ticker}:`, error);
    return [];
  }
}

/**
 * Remove duplicate articles based on title similarity
 */
function removeDuplicateArticles(articles) {
  const unique = [];
  const seenTitles = new Set();

  for (const article of articles) {
    const normalizedTitle = article.title.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Check if we've seen a very similar title
    let isDuplicate = false;
    for (const seenTitle of seenTitles) {
      if (calculateSimilarity(normalizedTitle, seenTitle) > 0.8) {
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      unique.push(article);
      seenTitles.add(normalizedTitle);
    }
  }

  return unique;
}

/**
 * Calculate similarity between two strings (0-1)
 */
function calculateSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1, str2) {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

module.exports = {
  fetchTickerNews
};
