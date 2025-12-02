const { stockIdeaOps } = require('../database');

// Re-use the fetchYahooData function from stocks route
async function fetchYahooData(ticker) {
    const PROXIES = [
        "https://corsproxy.io/?",
        "https://api.allorigins.win/raw?url=",
        "https://thingproxy.freeboard.io/fetch/",
        "https://api.codetabs.com/v1/proxy?quest="
    ];

    const YAHOO_BASE_URL = "https://query2.finance.yahoo.com/v8/finance/chart/";
    const symbol = ticker.toUpperCase();
    const targetUrl = `${YAHOO_BASE_URL}${symbol}?interval=1d&range=1d`;

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

            const result = data.chart?.result?.[0];
            if (!result) continue;

            const meta = result.meta;
            const currentPrice = meta.regularMarketPrice;

            if (currentPrice) {
                return currentPrice;
            }

        } catch (error) {
            continue;
        }
    }

    return null;
}

async function updateAllPrices() {
    console.log('[Price Update Job] Starting price update...');
    const startTime = Date.now();

    try {
        // Get all active stock ideas
        const ideas = stockIdeaOps.getAll();
        console.log(`[Price Update Job] Updating prices for ${ideas.length} ideas`);

        let successCount = 0;
        let failCount = 0;

        // Update prices in batches to avoid overwhelming the APIs
        const batchSize = 5;
        for (let i = 0; i < ideas.length; i += batchSize) {
            const batch = ideas.slice(i, i + batchSize);

            await Promise.all(batch.map(async (idea) => {
                try {
                    const newPrice = await fetchYahooData(idea.ticker);

                    if (newPrice && newPrice > 0) {
                        stockIdeaOps.updateCurrentPrice(idea.id, newPrice);
                        successCount++;
                        console.log(`[Price Update Job] Updated ${idea.ticker}: $${newPrice.toFixed(2)}`);
                    } else {
                        failCount++;
                        console.warn(`[Price Update Job] No price data for ${idea.ticker}`);
                    }
                } catch (error) {
                    failCount++;
                    console.error(`[Price Update Job] Error updating ${idea.ticker}:`, error.message);
                }
            }));

            // Small delay between batches
            if (i + batchSize < ideas.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`[Price Update Job] Completed in ${duration}s - Success: ${successCount}, Failed: ${failCount}`);

    } catch (error) {
        console.error('[Price Update Job] Fatal error:', error);
    }
}

// Check if market is open (Mon-Fri, 9:30 AM - 4:00 PM ET)
function isMarketOpen() {
    const now = new Date();
    const day = now.getUTCDay(); // 0 = Sunday, 6 = Saturday

    // Weekend check
    if (day === 0 || day === 6) {
        return false;
    }

    // Convert to ET (UTC-5 or UTC-4 depending on DST)
    // For simplicity, using UTC-5 (EST)
    const etHour = (now.getUTCHours() - 5 + 24) % 24;
    const etMinute = now.getUTCMinutes();

    // Market hours: 9:30 AM - 4:00 PM ET
    const marketStart = 9 * 60 + 30; // 9:30 AM in minutes
    const marketEnd = 16 * 60;       // 4:00 PM in minutes
    const currentTime = etHour * 60 + etMinute;

    return currentTime >= marketStart && currentTime < marketEnd;
}

module.exports = {
    updateAllPrices,
    isMarketOpen
};
