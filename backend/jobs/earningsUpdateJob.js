const { stockIdeaOps } = require('../database');
const { getEarningsData } = require('../services/earningsService');

/**
 * Update earnings data for all active stock ideas
 */
async function updateAllEarnings() {
    console.log('[Earnings Update Job] Starting earnings update...');
    const startTime = Date.now();

    try {
        // Get all active stock ideas
        const ideas = stockIdeaOps.getAll();
        const activeIdeas = ideas.filter(idea => idea.status === 'Active');

        console.log(`[Earnings Update Job] Updating earnings for ${activeIdeas.length} active ideas`);

        let successCount = 0;
        let failCount = 0;
        let noDataCount = 0;

        // Update earnings in batches to avoid overwhelming the APIs
        const batchSize = 3; // Smaller batch size for earnings API
        for (let i = 0; i < activeIdeas.length; i += batchSize) {
            const batch = activeIdeas.slice(i, i + batchSize);

            await Promise.all(batch.map(async (idea) => {
                try {
                    const earningsData = await getEarningsData(idea.ticker);

                    if (earningsData && earningsData.nextEarningsDate) {
                        stockIdeaOps.updateEarnings(
                            idea.id,
                            earningsData.nextEarningsDate,
                            earningsData.nextEarningsDateRaw,
                            earningsData.estimatedEPS || null
                        );
                        successCount++;
                        console.log(`[Earnings Update Job] Updated ${idea.ticker}: ${earningsData.nextEarningsDate}`);
                    } else {
                        noDataCount++;
                        console.log(`[Earnings Update Job] No earnings data for ${idea.ticker}`);
                    }
                } catch (error) {
                    failCount++;
                    console.error(`[Earnings Update Job] Error updating ${idea.ticker}:`, error.message);
                }
            }));

            // Delay between batches to respect API rate limits
            if (i + batchSize < activeIdeas.length) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`[Earnings Update Job] Completed in ${duration}s - Success: ${successCount}, No Data: ${noDataCount}, Failed: ${failCount}`);

    } catch (error) {
        console.error('[Earnings Update Job] Fatal error:', error);
    }
}

/**
 * Update earnings for ideas with upcoming earnings (within 30 days)
 * This is a more frequent, targeted update
 */
async function updateUpcomingEarnings() {
    console.log('[Earnings Update Job] Starting targeted earnings update for upcoming earnings...');
    const startTime = Date.now();

    try {
        // Get ideas with upcoming earnings
        const upcomingIdeas = stockIdeaOps.getUpcomingEarnings(30);

        if (upcomingIdeas.length === 0) {
            console.log('[Earnings Update Job] No upcoming earnings to update');
            return;
        }

        console.log(`[Earnings Update Job] Updating ${upcomingIdeas.length} ideas with upcoming earnings`);

        let successCount = 0;
        let failCount = 0;

        // Update with smaller batches due to more frequent updates
        const batchSize = 2;
        for (let i = 0; i < upcomingIdeas.length; i += batchSize) {
            const batch = upcomingIdeas.slice(i, i + batchSize);

            await Promise.all(batch.map(async (idea) => {
                try {
                    const earningsData = await getEarningsData(idea.ticker);

                    if (earningsData && earningsData.nextEarningsDate) {
                        stockIdeaOps.updateEarnings(
                            idea.id,
                            earningsData.nextEarningsDate,
                            earningsData.nextEarningsDateRaw,
                            earningsData.estimatedEPS || null
                        );
                        successCount++;
                        console.log(`[Earnings Update Job] Refreshed ${idea.ticker}: ${earningsData.nextEarningsDate}`);
                    }
                } catch (error) {
                    failCount++;
                    console.error(`[Earnings Update Job] Error refreshing ${idea.ticker}:`, error.message);
                }
            }));

            // Delay between batches
            if (i + batchSize < upcomingIdeas.length) {
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`[Earnings Update Job] Targeted update completed in ${duration}s - Success: ${successCount}, Failed: ${failCount}`);

    } catch (error) {
        console.error('[Earnings Update Job] Fatal error in targeted update:', error);
    }
}

module.exports = {
    updateAllEarnings,
    updateUpcomingEarnings
};
