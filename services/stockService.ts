import { StockIdea, HistoricalDataPoint, PerformanceMetrics } from '../types';

// List of public CORS proxies to try in order.
// Yahoo Finance can be picky, so rotating proxies helps reliability.
const PROXIES = [
    "https://corsproxy.io/?",
    "https://api.allorigins.win/raw?url=",
    "https://thingproxy.freeboard.io/fetch/",
    "https://api.codetabs.com/v1/proxy?quest="
];

const YAHOO_BASE_URL = "https://query2.finance.yahoo.com/v8/finance/chart/";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Updated Fallback prices (approximate values as of late 2024/early 2025)
const FALLBACK_PRICES: Record<string, number> = {
    'NVDA': 140.00, 'AAPL': 235.00, 'MSFT': 425.00, 'GOOG': 175.00,
    'AMZN': 195.00, 'TSLA': 250.00, 'META': 530.00, 'NFLX': 700.00,
    'AMD': 160.00, 'INTC': 23.00, 'PYPL': 84.00, 'GME': 25.00,
    'AMC': 5.00, 'PLTR': 42.00, 'COIN': 180.00, 'HOOD': 22.00,
    'SPY': 580.00, 'QQQ': 500.00, 'V': 285.00, 'MA': 460.00,
    'JPM': 220.00, 'DIS': 100.00, 'BA': 160.00, 'CRM': 300.00,
    'UBER': 75.00, 'ABNB': 140.00, 'SBUX': 95.00, 'NKE': 85.00
};

// Helper to fetch data from Yahoo using rotated proxies
const fetchYahooData = async (ticker: string): Promise<{ price: number, history: HistoricalDataPoint[] } | null> => {
    const symbol = ticker.toUpperCase();
    const targetUrl = `${YAHOO_BASE_URL}${symbol}?interval=1d&range=5y`;

    for (const proxy of PROXIES) {
        try {
            // Encode the target URL to ensure query parameters aren't lost by the proxy
            const encodedUrl = encodeURIComponent(targetUrl);
            const proxiedUrl = `${proxy}${encodedUrl}`;
            
            const response = await fetch(proxiedUrl, {
                // simple headers to avoid preflight issues with some proxies
                method: 'GET',
            });
            
            if (!response.ok) {
                // console.warn(`Proxy ${proxy} failed for ${symbol}: ${response.status} ${response.statusText}`);
                continue; // Try next proxy
            }
            
            const text = await response.text();
            if (!text || text.trim().startsWith('<')) {
                 // HTML response usually means error page from proxy or Yahoo
                 continue;
            }

            let data;
            try {
                // Handle AllOrigins wrapper if it returns contents field (it shouldn't with 'raw', but safety first)
                const json = JSON.parse(text);
                data = json.contents ? JSON.parse(json.contents) : json;
            } catch (e) {
                continue;
            }
            
            const result = data.chart?.result?.[0];
            
            if (!result) {
                // Yahoo sometimes returns { chart: { error: ... } }
                if (data.chart?.error) {
                   console.warn(`Yahoo API Error for ${symbol}:`, data.chart.error);
                }
                continue;
            }

            const meta = result.meta;
            const currentPrice = meta.regularMarketPrice;
            
            const timestamps = result.timestamp || [];
            const quote = result.indicators?.quote?.[0] || {};
            const closes = quote.close || [];
            
            const history: HistoricalDataPoint[] = [];
            
            for (let i = 0; i < timestamps.length; i++) {
                // Ensure we have a valid price and date
                if (timestamps[i] && closes[i] !== null && closes[i] !== undefined) {
                    history.push({
                        date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
                        price: parseFloat(closes[i].toFixed(2))
                    });
                }
            }
            
            // console.log(`Success fetching ${symbol} via ${proxy}`);
            return { price: currentPrice, history };

        } catch (error) {
            // console.warn(`Error fetching ${symbol} via ${proxy}:`, error);
            // Continue to next proxy
        }
    }

    console.error(`All proxies failed for ${symbol}. Using fallback.`);
    return null;
};

// Deterministic random number generator for fallback mocks
const seededRandom = (seed: number) => {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
};

const generateMockHistory = (ticker: string, currentPrice: number): HistoricalDataPoint[] => {
    const history: HistoricalDataPoint[] = [];
    const now = Date.now();
    let price = currentPrice;
    const seed = ticker.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

    // Generate a slightly more realistic trend (e.g. general market drift) 
    // rather than pure random walk to look better in UI if fallback is used.
    for (let i = 0; i < 365 * 5; i++) { // 5 years back
        const date = new Date(now - (i * ONE_DAY_MS));
        history.push({
            date: date.toISOString().split('T')[0],
            price: parseFloat(price.toFixed(2))
        });
        
        // Reverse engineer walk: 
        // We want the "past" price. If current is 100, and yesterday was 99, change was +1%.
        // So price(t-1) = price(t) / (1 + change)
        
        // Bias slightly positive over long term (stocks go up) -> means we divide by > 1 slightly more often going back?
        // Actually, if we want graph to go UP from left to right, we need past prices to be lower.
        // So going backwards, price should generally decrease (divide by > 1).
        
        const randomChange = (seededRandom(seed + i) - 0.45) * 2.5; // slight bias to 0.05 positive mean
        const factor = 1 + (randomChange / 100);
        
        price = price / factor;
        if (price < 0.1) price = 0.1;
    }
    // We generated backwards from Now -> Past, but array should be Oldest -> Newest
    return history.reverse();
};

export const getStockHistory = async (ticker: string): Promise<HistoricalDataPoint[]> => {
    const data = await fetchYahooData(ticker);
    if (data && data.history.length > 0) {
        return data.history;
    }
    
    // Fallback
    const fallbackPrice = FALLBACK_PRICES[ticker.toUpperCase()] ?? 100;
    return generateMockHistory(ticker, fallbackPrice);
};

export const getCurrentPrice = async (ticker: string): Promise<number> => {
    // If we already fetched data recently, we might have it, but for simplicity we fetch again
    // or rely on the same internal caching if we implemented it.
    // Ideally, we fetch once for both.
    const data = await fetchYahooData(ticker);
    if (data) {
        return data.price;
    }

    const t = ticker.toUpperCase();
    if (FALLBACK_PRICES[t]) return FALLBACK_PRICES[t];
    
    return 100.00; // Generic default
};

export const getCompanyProfile = async (ticker: string): Promise<{ name: string }> => {
    const map: Record<string, string> = {
        'AAPL': 'Apple Inc.', 'MSFT': 'Microsoft Corporation', 'GOOG': 'Alphabet Inc.',
        'AMZN': 'Amazon.com Inc.', 'TSLA': 'Tesla, Inc.', 'NVDA': 'NVIDIA Corporation',
        'META': 'Meta Platforms, Inc.', 'GME': 'GameStop Corp.', 'AMC': 'AMC Entertainment',
        'PLTR': 'Palantir Technologies', 'PYPL': 'PayPal Holdings', 'NFLX': 'Netflix, Inc.',
        'AMD': 'Advanced Micro Devices', 'INTC': 'Intel Corporation', 'SPY': 'SPDR S&P 500 ETF',
        'QQQ': 'Invesco QQQ Trust', 'V': 'Visa Inc.', 'MA': 'Mastercard Inc.',
        'JPM': 'JPMorgan Chase & Co.', 'DIS': 'Walt Disney Company', 'BA': 'Boeing Company',
        'COIN': 'Coinbase Global', 'HOOD': 'Robinhood Markets', 'CRM': 'Salesforce',
        'UBER': 'Uber Technologies', 'ABNB': 'Airbnb, Inc.', 'SBUX': 'Starbucks Corp.',
        'NKE': 'Nike, Inc.'
    };
    return { name: map[ticker.toUpperCase()] || `${ticker.toUpperCase()} Corp.` };
}

export const calculatePerformance = (
  entryPrice: number, 
  currentPrice: number, 
  history: HistoricalDataPoint[], 
  entryDate: string
): PerformanceMetrics => {
  
  const pct = (start: number, end: number) => {
      if (!start || start === 0) return 0;
      return ((end - start) / start) * 100;
  };

  const totalReturn = pct(entryPrice, currentPrice);

  if (!history || history.length === 0) {
      return { '1W': 0, '1M': 0, '6M': 0, 'YTD': 0, '1Y': 0, 'Total': totalReturn };
  }

  const getPriceAtAgo = (daysAgo: number): number => {
      const targetDate = new Date(Date.now() - (daysAgo * ONE_DAY_MS)).toISOString().split('T')[0];
      // Find closest date in history (sorted oldest to newest)
      // We search backwards from end for better performance on recent dates
      for (let i = history.length - 1; i >= 0; i--) {
          if (history[i].date <= targetDate) {
              return history[i].price;
          }
      }
      return history[0].price;
  };
  
  const ytdDate = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
  const ytdPricePoint = history.find(p => p.date >= ytdDate);
  const ytdPrice = ytdPricePoint?.price ?? history[0].price;

  return {
    '1W': pct(getPriceAtAgo(7), currentPrice),
    '1M': pct(getPriceAtAgo(30), currentPrice),
    '6M': pct(getPriceAtAgo(180), currentPrice),
    'YTD': pct(ytdPrice, currentPrice),
    '1Y': pct(getPriceAtAgo(365), currentPrice),
    'Total': totalReturn,
  };
};