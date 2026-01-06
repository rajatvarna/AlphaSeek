/**
 * Analytics Service - Calculate performance metrics and attribution
 */

const { stockIdeaOps } = require('../database');

/**
 * Calculate performance attribution for all ideas
 */
function calculatePerformanceAttribution() {
  const allIdeas = stockIdeaOps.getAll();

  // Filter to only active and exited ideas (ideas with actual returns)
  const ideas = allIdeas.filter(idea =>
    idea.status === 'Active' || idea.status === 'Exited' || idea.status === 'Stopped Out'
  );

  // Calculate current return for each idea
  const ideasWithReturns = ideas.map(idea => {
    let returnPct;

    if (idea.status === 'Exited' || idea.status === 'Stopped Out') {
      // Use actual return if exited
      returnPct = idea.actual_return || 0;
    } else {
      // Calculate unrealized return for active ideas
      returnPct = ((idea.current_price - idea.entry_price) / idea.entry_price) * 100;
    }

    return {
      ...idea,
      returnPct,
      isProfit: returnPct >= 0
    };
  });

  // Overall statistics
  const totalIdeas = ideasWithReturns.length;
  const profitableIdeas = ideasWithReturns.filter(i => i.isProfit).length;
  const losingIdeas = totalIdeas - profitableIdeas;
  const winRate = totalIdeas > 0 ? (profitableIdeas / totalIdeas) * 100 : 0;

  const avgReturn = totalIdeas > 0
    ? ideasWithReturns.reduce((sum, i) => sum + i.returnPct, 0) / totalIdeas
    : 0;

  const avgWin = profitableIdeas > 0
    ? ideasWithReturns.filter(i => i.isProfit).reduce((sum, i) => sum + i.returnPct, 0) / profitableIdeas
    : 0;

  const avgLoss = losingIdeas > 0
    ? ideasWithReturns.filter(i => !i.isProfit).reduce((sum, i) => sum + i.returnPct, 0) / losingIdeas
    : 0;

  // Best and worst performers
  const sortedByReturn = [...ideasWithReturns].sort((a, b) => b.returnPct - a.returnPct);
  const bestPerformers = sortedByReturn.slice(0, 5);
  const worstPerformers = sortedByReturn.slice(-5).reverse();

  // Attribution by source type
  const bySourceType = {};
  ideasWithReturns.forEach(idea => {
    if (!bySourceType[idea.source_type]) {
      bySourceType[idea.source_type] = {
        count: 0,
        totalReturn: 0,
        profitable: 0,
        avgReturn: 0
      };
    }

    bySourceType[idea.source_type].count++;
    bySourceType[idea.source_type].totalReturn += idea.returnPct;
    if (idea.isProfit) bySourceType[idea.source_type].profitable++;
  });

  // Calculate averages for each source type
  Object.keys(bySourceType).forEach(type => {
    bySourceType[type].avgReturn = bySourceType[type].totalReturn / bySourceType[type].count;
    bySourceType[type].winRate = (bySourceType[type].profitable / bySourceType[type].count) * 100;
  });

  // Attribution by conviction
  const byConviction = {};
  ideasWithReturns.forEach(idea => {
    if (!byConviction[idea.conviction]) {
      byConviction[idea.conviction] = {
        count: 0,
        totalReturn: 0,
        profitable: 0,
        avgReturn: 0
      };
    }

    byConviction[idea.conviction].count++;
    byConviction[idea.conviction].totalReturn += idea.returnPct;
    if (idea.isProfit) byConviction[idea.conviction].profitable++;
  });

  // Calculate averages for each conviction level
  Object.keys(byConviction).forEach(level => {
    byConviction[level].avgReturn = byConviction[level].totalReturn / byConviction[level].count;
    byConviction[level].winRate = (byConviction[level].profitable / byConviction[level].count) * 100;
  });

  // Monthly performance
  const monthlyPerformance = calculateMonthlyPerformance(ideasWithReturns);

  return {
    overall: {
      totalIdeas,
      profitableIdeas,
      losingIdeas,
      winRate,
      avgReturn,
      avgWin,
      avgLoss
    },
    bestPerformers: bestPerformers.map(i => ({
      ticker: i.ticker,
      companyName: i.company_name,
      return: i.returnPct,
      entryDate: i.entry_date,
      status: i.status
    })),
    worstPerformers: worstPerformers.map(i => ({
      ticker: i.ticker,
      companyName: i.company_name,
      return: i.returnPct,
      entryDate: i.entry_date,
      status: i.status
    })),
    bySourceType,
    byConviction,
    monthlyPerformance
  };
}

/**
 * Calculate monthly performance breakdown
 */
function calculateMonthlyPerformance(ideasWithReturns) {
  const monthly = {};

  ideasWithReturns.forEach(idea => {
    const date = new Date(idea.entry_date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!monthly[monthKey]) {
      monthly[monthKey] = {
        month: monthKey,
        ideasAdded: 0,
        totalReturn: 0,
        profitable: 0,
        avgReturn: 0
      };
    }

    monthly[monthKey].ideasAdded++;
    monthly[monthKey].totalReturn += idea.returnPct;
    if (idea.isProfit) monthly[monthKey].profitable++;
  });

  // Calculate averages
  Object.keys(monthly).forEach(month => {
    monthly[month].avgReturn = monthly[month].totalReturn / monthly[month].ideasAdded;
    monthly[month].winRate = (monthly[month].profitable / monthly[month].ideasAdded) * 100;
  });

  // Convert to array and sort by month
  return Object.values(monthly).sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Calculate sector allocation
 */
function calculateSectorAllocation() {
  const allIdeas = stockIdeaOps.getAll();
  const activeIdeas = allIdeas.filter(idea => idea.status === 'Active');

  // Group by tags (assuming tags include sector information)
  const sectorGroups = {};

  activeIdeas.forEach(idea => {
    if (idea.tags && idea.tags.length > 0) {
      idea.tags.forEach(tag => {
        if (!sectorGroups[tag]) {
          sectorGroups[tag] = {
            name: tag,
            count: 0,
            ideas: []
          };
        }

        sectorGroups[tag].count++;
        sectorGroups[tag].ideas.push({
          ticker: idea.ticker,
          companyName: idea.company_name
        });
      });
    } else {
      // Uncategorized
      if (!sectorGroups['Uncategorized']) {
        sectorGroups['Uncategorized'] = {
          name: 'Uncategorized',
          count: 0,
          ideas: []
        };
      }

      sectorGroups['Uncategorized'].count++;
      sectorGroups['Uncategorized'].ideas.push({
        ticker: idea.ticker,
        companyName: idea.company_name
      });
    }
  });

  // Calculate percentages
  const total = activeIdeas.length;
  const sectors = Object.values(sectorGroups).map(sector => ({
    ...sector,
    percentage: total > 0 ? (sector.count / total) * 100 : 0
  }));

  // Sort by count descending
  sectors.sort((a, b) => b.count - a.count);

  return {
    total,
    sectors
  };
}

/**
 * Get portfolio summary statistics
 */
function getPortfolioSummary() {
  const allIdeas = stockIdeaOps.getAll();

  const byStatus = {
    Active: 0,
    Watching: 0,
    Exited: 0,
    'Stopped Out': 0,
    Archived: 0,
    Invalidated: 0
  };

  allIdeas.forEach(idea => {
    if (byStatus[idea.status] !== undefined) {
      byStatus[idea.status]++;
    }
  });

  return {
    total: allIdeas.length,
    byStatus
  };
}

module.exports = {
  calculatePerformanceAttribution,
  calculateSectorAllocation,
  getPortfolioSummary
};
