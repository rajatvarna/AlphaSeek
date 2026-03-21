export type SourceType = 'Reddit' | 'X' | 'Hedge Fund' | 'Blog' | 'News' | 'Other';
export type IdeaStatus = 'Watchlist' | 'Active' | 'Closed';

export interface IdeaNote {
  id: string;
  date: string;
  content: string;
}

export interface StockIdea {
  id: string;
  ticker: string;
  companyName: string;
  description?: string; // Company description fetched from API
  source: string; // URL or Name
  sourceType: SourceType;
  originalLink?: string;
  entryDate: string; // ISO Date
  entryPrice: number;
  currentPrice: number;
  thesis: string;
  summary: string;
  conviction: 'High' | 'Medium' | 'Low';
  tags: string[];
  status?: IdeaStatus;
  priceTarget?: number;
  stopLoss?: number;
  exitPrice?: number;
  exitDate?: string;
  notes?: IdeaNote[];
}

export interface HistoricalDataPoint {
  date: string;
  price: number;
}

export interface PerformanceMetrics {
  '1W': number;
  '1M': number;
  '6M': number;
  'YTD': number;
  '1Y': number;
  'Total': number;
}

export type Timeframe = '1W' | '1M' | '6M' | 'YTD' | '1Y' | 'ALL';