// Fetch fundamental data from Yahoo Finance
const { db } = require('../database');

// Cache fundamental data
db.exec(`
  CREATE TABLE IF NOT EXISTS fundamentals_cache (
    ticker TEXT PRIMARY KEY,
    market_cap REAL,
    pe_ratio REAL,
    eps REAL,
    volume REAL,
    week_52_high REAL,
    week_52_low REAL,
    dividend_yield REAL,
    beta REAL,
    sector TEXT,
    industry TEXT,
    cached_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

const PROXIES = [
    "https://corsproxy.io/?",
    "https://api.allorigins.win/raw?url=",
    "https://thingproxy.freeboard.io/fetch/",
    "https://api.codetabs.com/v1/proxy?quest="
];

async function fetchFundamentals(ticker) {
  const symbol = ticker.toUpperCase();

  // Check cache first (24 hour TTL)
  const cached = db.prepare(`
    SELECT * FROM fundamentals_cache
    WHERE ticker = ? AND datetime(cached_at) > datetime('now', '-24 hours')
  `).get(symbol);

  if (cached) {
    return formatFundamentals(cached);
  }

  // Fetch from Yahoo Finance
  const targetUrl = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=summaryDetail,defaultKeyStatistics,price`;

  for (const proxy of PROXIES) {
    try {
      const encodedUrl = encodeURIComponent(targetUrl);
      const proxiedUrl = `${proxy}${encodedUrl}`;

      const response = await fetch(proxiedUrl, {
        method: 'GET',
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });

      if (!response.ok) continue;

      const text = await response.text();
      if (!text || text.trim().startsWith('<')) continue;

      let data;
      try {
        const json = JSON.parse(text);
        data = json.contents ? JSON.parse(json.contents) : json;
      } catch (e) {
        continue;
      }

      const result = data.quoteSummary?.result?.[0];
      if (!result) continue;

      const summaryDetail = result.summaryDetail || {};
      const keyStats = result.defaultKeyStatistics || {};
      const price = result.price || {};

      const fundamentals = {
        ticker: symbol,
        market_cap: price.marketCap?.raw || null,
        pe_ratio: summaryDetail.trailingPE?.raw || null,
        eps: keyStats.trailingEps?.raw || null,
        volume: summaryDetail.volume?.raw || null,
        week_52_high: summaryDetail.fiftyTwoWeekHigh?.raw || null,
        week_52_low: summaryDetail.fiftyTwoWeekLow?.raw || null,
        dividend_yield: summaryDetail.dividendYield?.raw || null,
        beta: keyStats.beta?.raw || null,
        sector: price.sector || null,
        industry: price.industry || null
      };

      // Cache the result
      db.prepare(`
        INSERT OR REPLACE INTO fundamentals_cache (
          ticker, market_cap, pe_ratio, eps, volume, week_52_high, week_52_low,
          dividend_yield, beta, sector, industry, cached_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(
        fundamentals.ticker,
        fundamentals.market_cap,
        fundamentals.pe_ratio,
        fundamentals.eps,
        fundamentals.volume,
        fundamentals.week_52_high,
        fundamentals.week_52_low,
        fundamentals.dividend_yield,
        fundamentals.beta,
        fundamentals.sector,
        fundamentals.industry
      );

      return formatFundamentals(fundamentals);

    } catch (error) {
      continue;
    }
  }

  return null;
}

function formatFundamentals(data) {
  return {
    ticker: data.ticker,
    marketCap: data.market_cap ? formatMarketCap(data.market_cap) : 'N/A',
    marketCapRaw: data.market_cap,
    peRatio: data.pe_ratio ? data.pe_ratio.toFixed(2) : 'N/A',
    eps: data.eps ? `$${data.eps.toFixed(2)}` : 'N/A',
    volume: data.volume ? formatVolume(data.volume) : 'N/A',
    week52High: data.week_52_high ? `$${data.week_52_high.toFixed(2)}` : 'N/A',
    week52Low: data.week_52_low ? `$${data.week_52_low.toFixed(2)}` : 'N/A',
    dividendYield: data.dividend_yield ? `${(data.dividend_yield * 100).toFixed(2)}%` : 'N/A',
    beta: data.beta ? data.beta.toFixed(2) : 'N/A',
    sector: data.sector || 'N/A',
    industry: data.industry || 'N/A'
  };
}

function formatMarketCap(value) {
  if (!value) return 'N/A';

  if (value >= 1e12) {
    return `$${(value / 1e12).toFixed(2)}T`;
  } else if (value >= 1e9) {
    return `$${(value / 1e9).toFixed(2)}B`;
  } else if (value >= 1e6) {
    return `$${(value / 1e6).toFixed(2)}M`;
  }
  return `$${value.toFixed(0)}`;
}

function formatVolume(value) {
  if (!value) return 'N/A';

  if (value >= 1e9) {
    return `${(value / 1e9).toFixed(2)}B`;
  } else if (value >= 1e6) {
    return `${(value / 1e6).toFixed(2)}M`;
  } else if (value >= 1e3) {
    return `${(value / 1e3).toFixed(2)}K`;
  }
  return value.toFixed(0);
}

module.exports = {
  fetchFundamentals
};
