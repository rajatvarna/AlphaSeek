import { StockIdea, HistoricalDataPoint, PerformanceMetrics } from '../types';

// We use a public CORS proxy to access Yahoo Finance API from the browser.
// In a production environment, this should be handled by a backend proxy to protect keys and ensure stability.
const CORS_PROXY = "https://corsproxy.io/?";
const YAHOO_BASE_URL = "https://query1.finance.yahoo.com/v8/finance/chart/";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Fallback prices if API fails
const FALLBACK_PRICES: Record<string, number> = {
    'NVDA': 135.50, 'AAPL': 228.00, 'MSFT': 420.00, 'GOOG': 168.00,
    'AMZN': 188.00, 'TSLA': 240.00, 'META': 520.00, 'NFLX': 680.00,
    'AMD': 155.00, 'INTC': 21.00, 'PYPL': 63.00, 'GME': 22.00,
    'AMC': 4.50, 'PLTR': 32.00, 'COIN': 170.00, 'HOOD': 19.00,
    'SPY': 560.00, 'QQQ': 480.00, 'V': 275.00, 'MA': 450.00,
    'JPM': 210.00, 'DIS': 95.00, 'BA': 170.00
};

// Helper to fetch data from Yahoo
const fetchYahooData = async (ticker: string): Promise<{ price: number, history: HistoricalDataPoint[] } | null> => {
    try {
        const symbol = ticker.toUpperCase();
        const url = `${YAHOO_BASE_URL}${symbol}?interval=1d&range=5y`;
        const proxiedUrl = `${CORS_PROXY}${encodeURIComponent(url)}`;
        
        const response = await fetch(proxiedUrl);
        if (!response.ok) throw new Error('Network response was not ok');
        
        const data = await response.json();
        const result = data.chart.result[0];
        
        if (!result) throw new Error('No data found');

        const meta = result.meta;
        const currentPrice = meta.regularMarketPrice;
        
        const timestamps = result.timestamp || [];
        const quotes = result.indicators.quote[0].close || [];
        
        const history: HistoricalDataPoint[] = [];
        
        for (let i = 0; i < timestamps.length; i++) {
            if (timestamps[i] && quotes[i] !== null && quotes[i] !== undefined) {
                history.push({
                    date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
                    price: parseFloat(quotes[i].toFixed(2))
                });
            }
        }
        
        return { price: currentPrice, history };
    } catch (error) {
        console.warn(`Failed to fetch data for ${ticker}, using fallback.`, error);
        return null;
    }
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

    for (let i = 0; i < 365 * 5; i++) { // 5 years back
        const date = new Date(now - (i * ONE_DAY_MS));
        history.push({
            date: date.toISOString().split('T')[0],
            price: parseFloat(price.toFixed(2))
        });
        
        const change = (seededRandom(seed + i) - 0.5) * 3;
        price = price / (1 + change / 100);
        if (price < 0.1) price = 0.1;
    }
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
    const data = await fetchYahooData(ticker);
    if (data) {
        return data.price;
    }

    const t = ticker.toUpperCase();
    if (FALLBACK_PRICES[t]) return FALLBACK_PRICES[t];
    
    // Random fallback for unknown tickers if fetch fails
    return 100;
};

export const getCompanyProfile = async (ticker: string): Promise<{ name: string }> => {
    const map: Record<string, string> = {
        'AAPL': 'Apple Inc.', 'MSFT': 'Microsoft Corporation', 'GOOG': 'Alphabet Inc.',
        'AMZN': 'Amazon.com Inc.', 'TSLA': 'Tesla, Inc.', 'NVDA': 'NVIDIA Corporation',
        'META': 'Meta Platforms, Inc.', 'GME': 'GameStop Corp.', 'AMC': 'AMC Entertainment',
        'PLTR': 'Palantir Technologies', 'PYPL': 'PayPal Holdings', 'NFLX': 'Netflix, Inc.',
        'AMD': 'Advanced Micro Devices',
    };
    return { name: map[ticker.toUpperCase()] || `${ticker.toUpperCase()} Corp.` };
}

export const calculatePerformance = (
  entryPrice: number, 
  currentPrice: number, 
  history: HistoricalDataPoint[], 
  entryDate: string
): PerformanceMetrics => {
  
  if (!history || history.length === 0) {
      const fallbackPct = entryPrice > 0 ? ((currentPrice - entryPrice) / entryPrice) * 100 : 0;
      return { '1W': 0, '1M': 0, '6M': 0, 'YTD': 0, '1Y': 0, 'Total': fallbackPct };
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

  const pct = (start: number, end: number) => {
      if (!start || start === 0) return 0;
      return ((end - start) / start) * 100;
  };

  return {
    '1W': pct(getPriceAtAgo(7), currentPrice),
    '1M': pct(getPriceAtAgo(30), currentPrice),
    '6M': pct(getPriceAtAgo(180), currentPrice),
    'YTD': pct(ytdPrice, currentPrice),
    '1Y': pct(getPriceAtAgo(365), currentPrice),
    'Total': pct(entryPrice, currentPrice),
  };
};