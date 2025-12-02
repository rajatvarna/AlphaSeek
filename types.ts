export type SourceType = 'Reddit' | 'X' | 'Hedge Fund' | 'Blog' | 'News' | 'Other';
export type IdeaStatus = 'Active' | 'Watching' | 'Exited' | 'Stopped Out' | 'Archived' | 'Invalidated';
export type PositionStatus = 'watching' | 'invested' | 'exited';

export interface StockIdea {
  id: string;
  ticker: string;
  companyName: string;
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
  positionStatus?: PositionStatus;
  positionSize?: number;
  costBasis?: number;
  exitDate?: string;
  exitPrice?: number;
  exitReason?: string;
  actualReturn?: number;
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
  '3Y': number;
  '5Y': number;
  'Total': number;
}

export type Timeframe = '1W' | '1M' | '6M' | 'YTD' | '1Y' | '3Y' | '5Y' | 'ALL';
