const cron = require('node-cron');
const { updateAllPrices, isMarketOpen } = require('./priceUpdateJob');
const { createBackup } = require('./backupJob');
const { scrapeAll } = require('../services/scrapers/redditScraper');
const { checkAlerts } = require('./alertCheckerJob');

let isInitialized = false;

function initializeScheduler() {
    if (isInitialized) {
        console.warn('[Scheduler] Already initialized');
        return;
    }

    console.log('[Scheduler] Initializing background jobs...');

    // Update prices every 15 minutes during market hours (Mon-Fri, 9:30 AM - 4:00 PM ET)
    // Runs every 15 minutes
    cron.schedule('*/15 * * * *', async () => {
        if (isMarketOpen()) {
            console.log('[Scheduler] Market is open - running price update');
            await updateAllPrices();
        } else {
            console.log('[Scheduler] Market is closed - skipping price update');
        }
    });

    // Update prices once after market close (4:15 PM ET = 21:15 UTC)
    cron.schedule('15 21 * * 1-5', async () => {
        console.log('[Scheduler] Post-market price update');
        await updateAllPrices();
    });

    // Update prices before market open (9:00 AM ET = 14:00 UTC)
    cron.schedule('0 14 * * 1-5', async () => {
        console.log('[Scheduler] Pre-market price update');
        await updateAllPrices();
    });

    // Daily database backup at 2 AM
    cron.schedule('0 2 * * *', async () => {
        console.log('[Scheduler] Running daily database backup');
        await createBackup();
    });

    // Scrape Reddit every 6 hours
    cron.schedule('0 */6 * * *', async () => {
        console.log('[Scheduler] Running Reddit scrape');
        await scrapeAll();
    });

    // Check price alerts every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
        await checkAlerts();
    });

    // Run initial price update on startup (after 10 second delay)
    setTimeout(async () => {
        console.log('[Scheduler] Running initial price update...');
        await updateAllPrices();
    }, 10000);

    isInitialized = true;
    console.log('[Scheduler] Background jobs initialized successfully');
    console.log('[Scheduler] - Price updates: Every 15 min during market hours');
    console.log('[Scheduler] - Pre-market update: 9:00 AM ET (Mon-Fri)');
    console.log('[Scheduler] - Post-market update: 4:15 PM ET (Mon-Fri)');
    console.log('[Scheduler] - Alert checker: Every 5 minutes');
    console.log('[Scheduler] - Reddit scraping: Every 6 hours');
    console.log('[Scheduler] - Daily backup: 2:00 AM');
}

module.exports = {
    initializeScheduler
};
