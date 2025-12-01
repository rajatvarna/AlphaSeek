import { StockIdea, HistoricalDataPoint, PerformanceMetrics } from '../types';

// In a real browser-only app, Yahoo Finance API has CORS restrictions.
// We will simulate the data structure faithfully to how it would look if we had a backend proxy.
// This ensures the charts and performance logic are robust for the demo.

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Deterministic random number generator for consistent mock charts
const seededRandom = (seed: number) => {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
};

export const getMockStockHistory = (ticker: string, startDate: string): HistoricalDataPoint[] => {
  const start = new Date(startDate).getTime();
  const now = new Date().getTime();
  const days = Math.floor((now - start) / ONE_DAY_MS);
  
  // Seed based on ticker char codes
  let seed = ticker.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  let currentPrice = 100 + (seed % 500); // Random starting price 100-600
  const history: HistoricalDataPoint[] = [];

  for (let i = 0; i <= days + 365; i++) { // Generate a bit more history for context
     const date = new Date(start - (365 * ONE_DAY_MS) + (i * ONE_DAY_MS));
     if (date.getTime() > now) break;

     // Random walk
     const change = (seededRandom(seed + i) - 0.5) * 4; // +/- 2% volatility approx
     currentPrice = currentPrice * (1 + change / 100);
     
     if (currentPrice < 1) currentPrice = 1;

     history.push({
       date: date.toISOString().split('T')[0],
       price: parseFloat(currentPrice.toFixed(2))
     });
  }

  return history;
};

export const getCurrentPrice = async (ticker: string): Promise<number> => {
    // Simulate API latency
    await new Promise(resolve => setTimeout(resolve, 500));
    // Return the last price from our consistent mock generator
    const history = getMockStockHistory(ticker, '2023-01-01'); // arbitrary start for price check
    return history.length > 0 ? history[history.length - 1].price : 100;
};

export const getCompanyProfile = async (ticker: string): Promise<{ name: string }> => {
    // Basic mapping for common tickers, fallback to Generic
    const map: Record<string, string> = {
        'AAPL': 'Apple Inc.',
        'MSFT': 'Microsoft Corporation',
        'GOOG': 'Alphabet Inc.',
        'AMZN': 'Amazon.com Inc.',
        'TSLA': 'Tesla, Inc.',
        'NVDA': 'NVIDIA Corporation',
        'META': 'Meta Platforms, Inc.',
        'GME': 'GameStop Corp.',
        'AMC': 'AMC Entertainment',
        'PLTR': 'Palantir Technologies',
    };
    return { name: map[ticker.toUpperCase()] || `${ticker.toUpperCase()} Corp.` };
}

export const calculatePerformance = (
  entryPrice: number, 
  currentPrice: number, 
  history: HistoricalDataPoint[], 
  entryDate: string
): PerformanceMetrics => {
  
  // Handle empty history to prevent crashes on initial load
  if (!history || history.length === 0) {
      const fallbackPct = entryPrice > 0 ? ((currentPrice - entryPrice) / entryPrice) * 100 : 0;
      return {
          '1W': 0,
          '1M': 0,
          '6M': 0,
          'YTD': 0,
          '1Y': 0,
          'Total': fallbackPct,
      };
  }

  const getPriceAtAgo = (daysAgo: number): number => {
      const targetDate = new Date(Date.now() - (daysAgo * ONE_DAY_MS));
      // Find closest date in history
      const sorted = [...history].reverse();
      const found = sorted.find(p => new Date(p.date) <= targetDate);
      return found ? found.price : entryPrice;
  };
  
  const ytdDate = new Date(new Date().getFullYear(), 0, 1);
  const ytdPricePoint = history.find(p => new Date(p.date) >= ytdDate);
  // Safe access with fallback to first history point or entry price
  const ytdPrice = ytdPricePoint ? ytdPricePoint.price : (history[0]?.price ?? entryPrice);

  const pct = (start: number, end: number) => start === 0 ? 0 : ((end - start) / start) * 100;

  return {
    '1W': pct(getPriceAtAgo(7), currentPrice),
    '1M': pct(getPriceAtAgo(30), currentPrice),
    '6M': pct(getPriceAtAgo(180), currentPrice),
    'YTD': pct(ytdPrice, currentPrice),
    '1Y': pct(getPriceAtAgo(365), currentPrice),
    'Total': pct(entryPrice, currentPrice),
  };
};