import { StockIdea, PerformanceMetrics } from '../types';

export interface PortfolioStats {
  totalIdeas: number;
  totalReturn: number;
  averageReturn: number;
  winningIdeas: number;
  losingIdeas: number;
  winRate: number;
  bestPerformer: {
    ticker: string;
    return: number;
  } | null;
  worstPerformer: {
    ticker: string;
    return: number;
  } | null;
  bySource: {
    [key: string]: {
      count: number;
      avgReturn: number;
      totalReturn: number;
    };
  };
  byConviction: {
    [key: string]: {
      count: number;
      avgReturn: number;
      winRate: number;
    };
  };
  byTimeframe: {
    '1W': number;
    '1M': number;
    '6M': number;
    'YTD': number;
    '1Y': number;
    '3Y': number;
    '5Y': number;
  };
}

export function calculatePortfolioStats(
  ideas: StockIdea[],
  performanceMap: Map<string, PerformanceMetrics>
): PortfolioStats {
  if (ideas.length === 0) {
    return {
      totalIdeas: 0,
      totalReturn: 0,
      averageReturn: 0,
      winningIdeas: 0,
      losingIdeas: 0,
      winRate: 0,
      bestPerformer: null,
      worstPerformer: null,
      bySource: {},
      byConviction: {},
      byTimeframe: {
        '1W': 0,
        '1M': 0,
        '6M': 0,
        'YTD': 0,
        '1Y': 0,
        '3Y': 0,
        '5Y': 0,
      },
    };
  }

  let totalReturn = 0;
  let winningIdeas = 0;
  let losingIdeas = 0;
  let bestPerformer: { ticker: string; return: number } | null = null;
  let worstPerformer: { ticker: string; return: number } | null = null;

  const bySource: { [key: string]: { returns: number[]; count: number } } = {};
  const byConviction: { [key: string]: { returns: number[]; wins: number; count: number } } = {};
  const timeframeReturns = {
    '1W': [] as number[],
    '1M': [] as number[],
    '6M': [] as number[],
    'YTD': [] as number[],
    '1Y': [] as number[],
    '3Y': [] as number[],
    '5Y': [] as number[],
  };

  ideas.forEach((idea) => {
    const performance = performanceMap.get(idea.id);
    if (!performance) return;

    const ideaReturn = performance.Total;
    totalReturn += ideaReturn;

    if (ideaReturn >= 0) {
      winningIdeas++;
    } else {
      losingIdeas++;
    }

    // Track best and worst
    if (!bestPerformer || ideaReturn > bestPerformer.return) {
      bestPerformer = { ticker: idea.ticker, return: ideaReturn };
    }
    if (!worstPerformer || ideaReturn < worstPerformer.return) {
      worstPerformer = { ticker: idea.ticker, return: ideaReturn };
    }

    // By source
    if (!bySource[idea.sourceType]) {
      bySource[idea.sourceType] = { returns: [], count: 0 };
    }
    bySource[idea.sourceType].returns.push(ideaReturn);
    bySource[idea.sourceType].count++;

    // By conviction
    if (!byConviction[idea.conviction]) {
      byConviction[idea.conviction] = { returns: [], wins: 0, count: 0 };
    }
    byConviction[idea.conviction].returns.push(ideaReturn);
    byConviction[idea.conviction].count++;
    if (ideaReturn >= 0) {
      byConviction[idea.conviction].wins++;
    }

    // By timeframe
    timeframeReturns['1W'].push(performance['1W']);
    timeframeReturns['1M'].push(performance['1M']);
    timeframeReturns['6M'].push(performance['6M']);
    timeframeReturns['YTD'].push(performance.YTD);
    timeframeReturns['1Y'].push(performance['1Y']);
    timeframeReturns['3Y'].push(performance['3Y']);
    timeframeReturns['5Y'].push(performance['5Y']);
  });

  // Calculate averages
  const averageReturn = totalReturn / ideas.length;
  const winRate = (winningIdeas / ideas.length) * 100;

  // Process by source
  const bySourceStats: PortfolioStats['bySource'] = {};
  Object.entries(bySource).forEach(([source, data]) => {
    const avgReturn = data.returns.reduce((a, b) => a + b, 0) / data.returns.length;
    bySourceStats[source] = {
      count: data.count,
      avgReturn,
      totalReturn: data.returns.reduce((a, b) => a + b, 0),
    };
  });

  // Process by conviction
  const byConvictionStats: PortfolioStats['byConviction'] = {};
  Object.entries(byConviction).forEach(([conviction, data]) => {
    const avgReturn = data.returns.reduce((a, b) => a + b, 0) / data.returns.length;
    byConvictionStats[conviction] = {
      count: data.count,
      avgReturn,
      winRate: (data.wins / data.count) * 100,
    };
  });

  // Process by timeframe
  const byTimeframeStats: PortfolioStats['byTimeframe'] = {
    '1W': timeframeReturns['1W'].reduce((a, b) => a + b, 0) / timeframeReturns['1W'].length,
    '1M': timeframeReturns['1M'].reduce((a, b) => a + b, 0) / timeframeReturns['1M'].length,
    '6M': timeframeReturns['6M'].reduce((a, b) => a + b, 0) / timeframeReturns['6M'].length,
    'YTD': timeframeReturns['YTD'].reduce((a, b) => a + b, 0) / timeframeReturns['YTD'].length,
    '1Y': timeframeReturns['1Y'].reduce((a, b) => a + b, 0) / timeframeReturns['1Y'].length,
    '3Y': timeframeReturns['3Y'].reduce((a, b) => a + b, 0) / timeframeReturns['3Y'].length,
    '5Y': timeframeReturns['5Y'].reduce((a, b) => a + b, 0) / timeframeReturns['5Y'].length,
  };

  return {
    totalIdeas: ideas.length,
    totalReturn,
    averageReturn,
    winningIdeas,
    losingIdeas,
    winRate,
    bestPerformer,
    worstPerformer,
    bySource: bySourceStats,
    byConviction: byConvictionStats,
    byTimeframe: byTimeframeStats,
  };
}

export function calculateSharpeRatio(returns: number[], riskFreeRate: number = 0.04): number {
  if (returns.length === 0) return 0;

  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const excessReturn = avgReturn - riskFreeRate;

  // Calculate standard deviation
  const variance =
    returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) return 0;
  return excessReturn / stdDev;
}
