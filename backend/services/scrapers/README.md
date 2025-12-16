# AlphaSeek Stock Idea Scrapers

This directory contains scrapers that automatically collect stock investment ideas from multiple sources across the internet.

## Available Scrapers

### 1. Reddit Scraper (`redditScraper.js`)
Monitors popular investing subreddits for stock discussions.

**Monitored Subreddits:**
- r/wallstreetbets
- r/stocks
- r/investing
- r/StockMarket
- r/ValueInvesting

**Schedule:** Every 6 hours

**Setup:**
1. Create a Reddit app at https://www.reddit.com/prefs/apps
2. Add credentials to `.env`:
```env
REDDIT_CLIENT_ID=your-client-id
REDDIT_CLIENT_SECRET=your-client-secret
REDDIT_REFRESH_TOKEN=your-refresh-token
```

### 2. Twitter Scraper (`twitterScraper.js`)
Monitors financial Twitter accounts and searches for stock discussions.

**Monitored Accounts:**
- @MarketWatch, @WSJ, @CNBC, @Bloomberg
- @YahooFinance, @jimcramer, @GerberKawasaki
- @Reuters, @FinancialTimes, @TechCrunch

**Search Queries:**
- "stock pick", "buying $", "bullish on $"
- "investment idea", "undervalued stock"

**Schedule:** Every 4 hours

**Setup:**
1. Get Twitter API Bearer Token from https://developer.twitter.com/en/portal/dashboard
2. Add to `.env`:
```env
TWITTER_BEARER_TOKEN=your-bearer-token
```

### 3. RSS Feed Scraper (`rssFeedScraper.js`)
Scrapes finance blogs and Substack newsletters via RSS feeds.

**Monitored Sources:**
- **High Priority:**
  - The Diff (Byrne Hobart)
  - Net Interest
  - Stratechery

- **Medium Priority:**
  - Seeking Alpha
  - A Wealth of Common Sense
  - Abnormal Returns
  - The Reformed Broker
  - Calculating Risk

- **Low Priority:**
  - Marginal Revolution

**Schedule:** Every 8 hours

**Setup:** No API keys needed - uses public RSS feeds

### 4. ValueInvestorsClub Scraper (`valueInvestorsClubScraper.js`)
Scrapes investment ideas from ValueInvestorsClub.

**Schedule:** Daily at 10:00 AM UTC

**Setup:**
1. Sign up for VIC membership at https://www.valueinvestorsclub.com/
2. Add credentials to `.env` (optional):
```env
VIC_USERNAME=your-username
VIC_PASSWORD=your-password
```

**Note:** VIC has restrictions on automated scraping. Use responsibly and respect their terms of service.

### 5. Google News Scraper (`googleNewsScraper.js`)
Searches Google News for stock-related articles from major financial sites.

**Monitored Sites:**
- Seeking Alpha, Motley Fool, MarketWatch
- Bloomberg, Forbes Investing, Barron's
- Investor's Business Daily

**Search Queries:**
- "stock analysis", "stock picks 2025"
- "undervalued stocks", "value investing"
- "growth stocks", "dividend stocks"

**Schedule:** Every 3 hours

**Setup:** No API keys needed - uses public Google News RSS

## How It Works

### 1. Scraping Process
Each scraper:
1. Fetches content from its source (API, RSS, web scraping)
2. Extracts stock tickers using regex patterns (`$TICKER` or plain tickers)
3. Analyzes sentiment (bullish/bearish/neutral)
4. Calculates confidence score based on:
   - Sentiment confidence
   - Engagement metrics (likes, retweets, upvotes)
   - Source quality
5. Saves to `scraped_ideas` table for admin approval

### 2. Ticker Extraction
Uses `tickerExtractor.js` to:
- Find `$TICKER` format (most reliable)
- Find plain 2-5 letter uppercase words
- Filter out common false positives (CEO, IPO, USA, etc.)
- Validate ticker format

### 3. Sentiment Analysis
Uses the `sentiment` npm package to:
- Score text as positive/negative/neutral
- Calculate sentiment confidence
- Classify as bullish/bearish/neutral

### 4. Confidence Scoring
Each idea gets a confidence score (0-1) based on:
- **Sentiment confidence** (0-0.4)
- **Engagement metrics** (0-0.3)
  - Reddit: upvotes, comments
  - Twitter: likes, retweets
- **Source quality** (0-0.3)
  - High priority sources get higher scores

**Minimum threshold:** 0.25-0.3 confidence to save

### 5. Admin Approval Workflow
1. Scraped ideas go to `scraped_ideas` table
2. Admin reviews via `/api/scraper/pending` endpoint
3. Admin can:
   - **Approve:** Converts to full stock idea
   - **Reject:** Marks as rejected
   - **Ignore:** Leaves as pending

## Database Schema

```sql
CREATE TABLE scraped_ideas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,              -- e.g., "r/wallstreetbets", "@jimcramer"
  source_type TEXT DEFAULT 'Reddit', -- Reddit, Twitter, Blog, News
  reddit_id TEXT UNIQUE,             -- Unique identifier
  title TEXT NOT NULL,
  body TEXT,
  url TEXT NOT NULL,
  author TEXT,
  ticker TEXT NOT NULL,
  sentiment TEXT,                    -- bullish, bearish, neutral
  sentiment_score REAL,
  confidence REAL,
  upvotes INTEGER DEFAULT 0,
  num_comments INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  approved BOOLEAN DEFAULT FALSE,
  rejected BOOLEAN DEFAULT FALSE,
  processed_at DATETIME
)
```

## API Endpoints

### Get Pending Ideas (Admin)
```bash
GET /api/scraper/pending
Authorization: Bearer <admin-token>
```

### Manually Trigger Scraping (Admin)
```bash
POST /api/scraper/scrape
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "source": "all"  # Options: all, reddit, twitter, rss, vic, news
}
```

### Approve Scraped Idea (Admin)
```bash
POST /api/scraper/approve/:id
Authorization: Bearer <admin-token>
```

### Reject Scraped Idea (Admin)
```bash
POST /api/scraper/reject/:id
Authorization: Bearer <admin-token>
```

### Get Scraper Stats
```bash
GET /api/scraper/stats
Authorization: Bearer <token>

# Returns:
{
  "pending": 42,
  "approved": 128,
  "rejected": 15,
  "total": 185
}
```

## Running Scrapers

### Via API (Manual Trigger)
```bash
# Scrape all sources
curl -X POST http://localhost:5000/api/scraper/scrape \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"source": "all"}'

# Scrape specific source
curl -X POST http://localhost:5000/api/scraper/scrape \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"source": "twitter"}'
```

### Via Scheduled Jobs
Scrapers run automatically based on the schedule in `backend/jobs/scheduler.js`:
- Reddit: Every 6 hours
- Twitter: Every 4 hours
- RSS: Every 8 hours
- Google News: Every 3 hours
- VIC: Daily at 10 AM UTC

## Adding Custom RSS Feeds

You can add custom RSS feeds at runtime:

```javascript
const rssFeedScraper = require('./services/scrapers/rssFeedScraper');

rssFeedScraper.addCustomFeed(
  'Custom Finance Blog',
  'https://example.com/feed.xml',
  'Blog',
  'high'  // priority: high, medium, low
);
```

Or edit `rssFeedScraper.js` and add to the `RSS_FEEDS` array:

```javascript
const RSS_FEEDS = [
  // ... existing feeds
  {
    name: 'Your Custom Feed',
    url: 'https://yourcustomfeed.com/rss',
    type: 'Blog',
    priority: 'medium'
  }
];
```

## Rate Limiting & Best Practices

### Reddit
- Delay: 2 seconds between subreddits
- Limit: 25 posts per subreddit
- Uses official Reddit API via snoowrap

### Twitter
- Delay: 2-3 seconds between requests
- Limit: 10 tweets per account, 15 per search
- Respects Twitter API rate limits

### RSS Feeds
- Delay: 2 seconds between feeds
- Limit: 20 items per feed
- No authentication required

### Google News
- Delay: 2 seconds between queries
- Limit: 10 articles per query
- Uses public RSS feeds

### ValueInvestorsClub
- Delay: N/A (RSS-based)
- Respects VIC's terms of service
- Limited scraping to avoid abuse

## Troubleshooting

### No Ideas Being Found

1. **Check API credentials:**
```bash
# Verify .env file has correct credentials
cat .env | grep REDDIT
cat .env | grep TWITTER
```

2. **Check logs:**
```bash
# Look for scraper errors in server logs
[Reddit Scraper] Found 5 new ideas
[Twitter Scraper] Skipping - Twitter API not configured
```

3. **Test individual scraper:**
```bash
# Use manual trigger with specific source
POST /api/scraper/scrape
{ "source": "reddit" }
```

### Low Confidence Scores
- Adjust confidence thresholds in each scraper
- Current minimum: 0.25-0.3
- Higher threshold = fewer but higher quality ideas

### API Rate Limits
- Twitter: Free tier has strict limits - upgrade to paid tier
- Reddit: Free tier should be sufficient
- RSS/Google News: No API limits

### Duplicate Ideas
- Each scraper checks for existing `reddit_id` before inserting
- Duplicates across sources are allowed (same ticker, different source)

## Future Enhancements

Potential improvements:
- [ ] Add YouTube finance channels scraper
- [ ] Add Discord server scraper (with permission)
- [ ] Add Telegram group scraper
- [ ] Add SEC filings monitor
- [ ] Add hedge fund 13F filings tracker
- [ ] Add earnings call transcript analyzer
- [ ] Machine learning-based quality scoring
- [ ] Auto-approval for high-confidence ideas
- [ ] Browser extension for manual idea capture

## License

Part of AlphaSeek - Stock Investment Idea Aggregator
