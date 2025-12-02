const Sentiment = require('sentiment');
const analyzer = new Sentiment();

// Common stock ticker patterns
const TICKER_PATTERNS = [
  /\$([A-Z]{1,5})\b/g,           // $TICKER format
  /\b([A-Z]{2,5})\b(?=\s|$|\.)/g // Plain TICKER (2-5 caps)
];

// Common words that look like tickers but aren't
const BLACKLIST = new Set([
  'CEO', 'CFO', 'IPO', 'NYSE', 'NASDAQ', 'USA', 'US', 'UK', 'EU',
  'ETF', 'DD', 'YOLO', 'IMO', 'FOMO', 'ATH', 'EPS', 'PE', 'ROI',
  'SEC', 'FBI', 'IRS', 'AI', 'IT', 'AR', 'VR', 'GDP', 'CPI',
  'API', 'URL', 'PDF', 'CSV', 'JSON', 'HTML', 'CSS', 'EDIT',
  'TLDR', 'ELI5', 'AMA', 'TIL', 'PSA', 'FYI', 'ASAP', 'FAQ'
]);

/**
 * Extract potential stock tickers from text
 * Returns array of unique tickers found
 */
function extractTickers(text) {
  if (!text) return [];

  const tickers = new Set();

  // Extract $TICKER format (most reliable)
  const dollarMatches = text.match(/\$([A-Z]{1,5})\b/g);
  if (dollarMatches) {
    dollarMatches.forEach(match => {
      const ticker = match.substring(1); // Remove $
      if (!BLACKLIST.has(ticker)) {
        tickers.add(ticker);
      }
    });
  }

  // Only extract plain tickers if we found $TICKER format
  // This reduces false positives
  if (tickers.size === 0) {
    const plainMatches = text.match(/\b([A-Z]{2,5})\b/g);
    if (plainMatches) {
      plainMatches.forEach(ticker => {
        if (!BLACKLIST.has(ticker) && ticker.length >= 2 && ticker.length <= 5) {
          tickers.add(ticker);
        }
      });
    }
  }

  return Array.from(tickers);
}

/**
 * Analyze sentiment of text using sentiment.js
 * Returns sentiment score and classification
 */
function analyzeSentiment(text) {
  if (!text) {
    return { score: 0, sentiment: 'neutral', confidence: 0 };
  }

  const result = analyzer.analyze(text);

  let sentiment = 'neutral';
  if (result.score > 2) sentiment = 'bullish';
  else if (result.score < -2) sentiment = 'bearish';

  const confidence = Math.min(Math.abs(result.score) / 10, 1);

  return {
    score: result.score,
    sentiment,
    confidence,
    comparative: result.comparative,
    tokens: result.tokens.length,
    positive: result.positive,
    negative: result.negative
  };
}

/**
 * Validate if a ticker is likely real
 * Basic validation - can be enhanced with API calls
 */
function validateTicker(ticker) {
  if (!ticker || ticker.length < 1 || ticker.length > 5) {
    return false;
  }

  // Must be all uppercase letters
  if (!/^[A-Z]+$/.test(ticker)) {
    return false;
  }

  // Not in blacklist
  if (BLACKLIST.has(ticker)) {
    return false;
  }

  return true;
}

/**
 * Extract summary from text (first 200 chars)
 */
function extractSummary(text, maxLength = 200) {
  if (!text) return '';

  const cleaned = text
    .replace(/https?:\/\/\S+/g, '') // Remove URLs
    .replace(/\s+/g, ' ')           // Normalize whitespace
    .trim();

  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  // Try to break at sentence
  const sentences = cleaned.match(/[^.!?]+[.!?]+/g);
  if (sentences && sentences[0] && sentences[0].length <= maxLength) {
    return sentences[0].trim();
  }

  // Break at word boundary
  return cleaned.substring(0, maxLength).trim() + '...';
}

/**
 * Calculate confidence score for the extraction
 * Based on: presence of $TICKER, sentiment confidence, text length
 */
function calculateConfidence(tickers, sentiment, textLength) {
  let score = 0;

  // Ticker format bonus
  if (tickers.some(t => t.hasDollarSign)) {
    score += 0.3;
  }

  // Sentiment confidence
  score += sentiment.confidence * 0.3;

  // Text length (longer = more context)
  if (textLength > 100) score += 0.2;
  if (textLength > 500) score += 0.2;

  return Math.min(score, 1);
}

module.exports = {
  extractTickers,
  analyzeSentiment,
  validateTicker,
  extractSummary,
  calculateConfidence
};
