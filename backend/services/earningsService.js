/**
 * Earnings Service - Fetches earnings calendar data for stocks
 * Uses Yahoo Finance and other free data sources
 */

/**
 * Fetch earnings data for a specific ticker from Yahoo Finance
 */
async function fetchYahooEarningsData(ticker) {
  try {
    // Yahoo Finance calendar API endpoint (unofficial but publicly accessible)
    const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=calendarEvents,earnings`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!data.quoteSummary || !data.quoteSummary.result || data.quoteSummary.result.length === 0) {
      return null;
    }

    const result = data.quoteSummary.result[0];
    const calendarEvents = result.calendarEvents || {};
    const earnings = result.earnings || {};

    return {
      ticker: ticker.toUpperCase(),
      nextEarningsDate: calendarEvents.earnings?.earningsDate?.[0]?.fmt || null,
      nextEarningsDateRaw: calendarEvents.earnings?.earningsDate?.[0]?.raw || null,
      estimatedEPS: calendarEvents.earnings?.epsEstimate?.raw || null,
      actualEPS: calendarEvents.earnings?.epsActual?.raw || null,
      revenueEstimate: calendarEvents.earnings?.revenueEstimate?.raw || null,
      revenueActual: calendarEvents.earnings?.revenueActual?.raw || null,
      earningsHistory: earnings.earningsChart?.quarterly || [],
      financialsChart: earnings.financialsChart?.yearly || []
    };
  } catch (error) {
    console.error(`Error fetching earnings for ${ticker}:`, error.message);
    return null;
  }
}

/**
 * Fetch earnings calendar from alternative source (Nasdaq)
 */
async function fetchNasdaqEarningsDate(ticker) {
  try {
    // Nasdaq provides earnings calendar data
    const url = `https://api.nasdaq.com/api/company/${ticker}/earnings-calendar`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (!data.data || !data.data.earningsDate) {
      return null;
    }

    return {
      ticker: ticker.toUpperCase(),
      nextEarningsDate: data.data.earningsDate,
      earningsTime: data.data.earningsTime || null // BMO (before market open) or AMC (after market close)
    };
  } catch (error) {
    console.error(`Error fetching Nasdaq earnings for ${ticker}:`, error.message);
    return null;
  }
}

/**
 * Get comprehensive earnings data for a ticker
 */
async function getEarningsData(ticker) {
  try {
    // Try Yahoo Finance first
    const yahooData = await fetchYahooEarningsData(ticker);

    if (yahooData && yahooData.nextEarningsDate) {
      return yahooData;
    }

    // Fallback to Nasdaq if Yahoo doesn't have data
    const nasdaqData = await fetchNasdaqEarningsDate(ticker);

    if (nasdaqData && nasdaqData.nextEarningsDate) {
      return nasdaqData;
    }

    return null;
  } catch (error) {
    console.error(`Error getting earnings data for ${ticker}:`, error);
    return null;
  }
}

/**
 * Get earnings calendar for multiple tickers
 */
async function getEarningsCalendar(tickers) {
  const earningsData = await Promise.all(
    tickers.map(ticker => getEarningsData(ticker))
  );

  // Filter out nulls and sort by earnings date
  const validData = earningsData.filter(data => data !== null && data.nextEarningsDateRaw);

  validData.sort((a, b) => {
    const dateA = a.nextEarningsDateRaw || Infinity;
    const dateB = b.nextEarningsDateRaw || Infinity;
    return dateA - dateB;
  });

  return validData;
}

/**
 * Check if earnings are coming up soon (within N days)
 */
function isEarningsSoon(earningsDateRaw, withinDays = 7) {
  if (!earningsDateRaw) return false;

  const earningsDate = new Date(earningsDateRaw * 1000); // Convert Unix timestamp to JS Date
  const today = new Date();
  const diffTime = earningsDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays >= 0 && diffDays <= withinDays;
}

module.exports = {
  getEarningsData,
  getEarningsCalendar,
  isEarningsSoon
};
