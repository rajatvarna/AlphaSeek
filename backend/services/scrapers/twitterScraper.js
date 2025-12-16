const { extractTickers, analyzeSentiment, extractSummary } = require('./tickerExtractor');
const { db } = require('../../database');

// Twitter API v2 configuration
const TWITTER_CONFIG = {
  bearerToken: process.env.TWITTER_BEARER_TOKEN || '',
  apiVersion: '2'
};

// Twitter accounts to monitor for stock ideas
const TWITTER_ACCOUNTS = [
  'MarketWatch',
  'WSJ',
  'CNBC',
  'Bloomberg',
  'YahooFinance',
  'jimcramer',
  'carlquintanilla',
  'GerberKawasaki',
  'TechCrunch',
  'Reuters',
  'FinancialTimes'
];

// Twitter search queries for stock discussions
const SEARCH_QUERIES = [
  'stock pick',
  'buying $',
  'bullish on $',
  'investment idea',
  'undervalued stock'
];

async function initTwitterClient() {
  if (!TWITTER_CONFIG.bearerToken) {
    console.warn('[Twitter Scraper] Twitter Bearer Token not configured');
    console.warn('[Twitter Scraper] Set TWITTER_BEARER_TOKEN in .env');
    console.warn('[Twitter Scraper] Get it from: https://developer.twitter.com/en/portal/dashboard');
    return null;
  }

  return TWITTER_CONFIG.bearerToken;
}

/**
 * Fetch tweets from Twitter API v2
 */
async function fetchTweets(bearerToken, query, maxResults = 10) {
  try {
    const url = new URL('https://api.twitter.com/2/tweets/search/recent');
    url.searchParams.append('query', query);
    url.searchParams.append('max_results', maxResults);
    url.searchParams.append('tweet.fields', 'created_at,public_metrics,author_id,text');
    url.searchParams.append('expansions', 'author_id');
    url.searchParams.append('user.fields', 'username,name');

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.warn('[Twitter Scraper] Rate limit exceeded');
        return null;
      }
      throw new Error(`Twitter API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[Twitter Scraper] Error fetching tweets:', error.message);
    return null;
  }
}

/**
 * Fetch user timeline
 */
async function fetchUserTimeline(bearerToken, username, maxResults = 10) {
  try {
    // First, get user ID
    const userUrl = `https://api.twitter.com/2/users/by/username/${username}`;
    const userResponse = await fetch(userUrl, {
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!userResponse.ok) {
      console.warn(`[Twitter Scraper] Could not fetch user ${username}`);
      return null;
    }

    const userData = await userResponse.json();
    const userId = userData.data.id;

    // Fetch user's tweets
    const tweetsUrl = new URL(`https://api.twitter.com/2/users/${userId}/tweets`);
    tweetsUrl.searchParams.append('max_results', maxResults);
    tweetsUrl.searchParams.append('tweet.fields', 'created_at,public_metrics,text');

    const tweetsResponse = await fetch(tweetsUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!tweetsResponse.ok) {
      return null;
    }

    const tweetsData = await tweetsResponse.json();
    return {
      data: tweetsData.data || [],
      includes: { users: [userData.data] }
    };
  } catch (error) {
    console.error(`[Twitter Scraper] Error fetching timeline for ${username}:`, error.message);
    return null;
  }
}

function calculateConfidence(sentimentConfidence, likes, retweets, isVerifiedAccount = false) {
  let score = 0;

  // Sentiment confidence (0-0.3)
  score += sentimentConfidence * 0.3;

  // Engagement metrics (0-0.4)
  if (likes > 100) score += 0.2;
  else if (likes > 50) score += 0.15;
  else if (likes > 10) score += 0.1;

  if (retweets > 50) score += 0.2;
  else if (retweets > 20) score += 0.15;
  else if (retweets > 5) score += 0.1;

  // Verified account bonus (0-0.3)
  if (isVerifiedAccount) score += 0.3;

  return Math.min(score, 1);
}

async function processTweet(tweet, author) {
  try {
    const text = tweet.text;
    const tweetId = tweet.id;

    // Check if already processed
    const existing = db.prepare('SELECT id FROM scraped_ideas WHERE reddit_id = ?').get(`tw_${tweetId}`);
    if (existing) return null;

    // Extract tickers
    const tickers = extractTickers(text);
    if (tickers.length === 0) return null;

    // Analyze sentiment
    const sentiment = analyzeSentiment(text);

    const ideas = [];

    // Create idea for each ticker (max 2 per tweet)
    for (const ticker of tickers.slice(0, 2)) {
      const summary = extractSummary(text, 250);

      const metrics = tweet.public_metrics || {};
      const confidence = calculateConfidence(
        sentiment.confidence,
        metrics.like_count || 0,
        metrics.retweet_count || 0,
        author?.verified || false
      );

      // Only save if confidence is reasonable
      if (confidence < 0.25) continue;

      const idea = {
        source: `@${author?.username || 'unknown'}`,
        source_type: 'Twitter',
        reddit_id: `tw_${tweetId}_${ticker}`,
        title: summary,
        body: text,
        url: `https://twitter.com/${author?.username || 'i'}/status/${tweetId}`,
        author: author?.name || author?.username || 'Unknown',
        ticker,
        sentiment: sentiment.sentiment,
        sentiment_score: sentiment.score,
        confidence,
        upvotes: metrics.like_count || 0,
        num_comments: metrics.reply_count || 0
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

        ideas.push(idea);
        console.log(`[Twitter Scraper] Found ${ticker} from @${author?.username} (confidence: ${confidence.toFixed(2)})`);
      } catch (err) {
        if (!err.message.includes('UNIQUE constraint')) {
          console.error(`[Twitter Scraper] Error saving idea:`, err.message);
        }
      }
    }

    return ideas;
  } catch (error) {
    console.error('[Twitter Scraper] Error processing tweet:', error.message);
    return null;
  }
}

async function scrapeTwitterAccounts(bearerToken) {
  let totalIdeas = 0;

  for (const username of TWITTER_ACCOUNTS) {
    try {
      console.log(`[Twitter Scraper] Fetching tweets from @${username}...`);

      const data = await fetchUserTimeline(bearerToken, username, 10);
      if (!data || !data.data) continue;

      const author = data.includes?.users?.[0];

      for (const tweet of data.data) {
        const ideas = await processTweet(tweet, author);
        if (ideas) {
          totalIdeas += ideas.length;
        }
      }

      // Delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`[Twitter Scraper] Error scraping @${username}:`, error.message);
    }
  }

  return totalIdeas;
}

async function scrapeTwitterSearch(bearerToken) {
  let totalIdeas = 0;

  for (const query of SEARCH_QUERIES) {
    try {
      console.log(`[Twitter Scraper] Searching for "${query}"...`);

      const data = await fetchTweets(bearerToken, query, 15);
      if (!data || !data.data) continue;

      const users = data.includes?.users || [];
      const userMap = {};
      users.forEach(user => {
        userMap[user.id] = user;
      });

      for (const tweet of data.data) {
        const author = userMap[tweet.author_id];
        const ideas = await processTweet(tweet, author);
        if (ideas) {
          totalIdeas += ideas.length;
        }
      }

      // Delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error) {
      console.error(`[Twitter Scraper] Error searching "${query}":`, error.message);
    }
  }

  return totalIdeas;
}

async function scrapeAll() {
  console.log('[Twitter Scraper] Starting scrape job...');
  const startTime = Date.now();

  const bearerToken = await initTwitterClient();
  if (!bearerToken) {
    console.log('[Twitter Scraper] Skipping - Twitter API not configured');
    return { success: false, ideasFound: 0 };
  }

  let totalIdeas = 0;

  // Scrape followed accounts
  const accountIdeas = await scrapeTwitterAccounts(bearerToken);
  totalIdeas += accountIdeas;

  // Scrape search queries
  const searchIdeas = await scrapeTwitterSearch(bearerToken);
  totalIdeas += searchIdeas;

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`[Twitter Scraper] Completed in ${duration}s - Found ${totalIdeas} new ideas`);

  return { success: true, ideasFound: totalIdeas };
}

module.exports = {
  scrapeAll,
  fetchTweets,
  fetchUserTimeline,
  processTweet
};
