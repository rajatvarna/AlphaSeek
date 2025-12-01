const express = require('express');
const router = express.Router();
const { priceHistoryOps } = require('../database');
const { authenticateToken } = require('../middleware/auth');

// Yahoo Finance proxy configuration
const PROXIES = [
    "https://corsproxy.io/?",
    "https://api.allorigins.win/raw?url=",
    "https://thingproxy.freeboard.io/fetch/",
    "https://api.codetabs.com/v1/proxy?quest="
];

const YAHOO_BASE_URL = "https://query2.finance.yahoo.com/v8/finance/chart/";

// Fallback prices
const FALLBACK_PRICES = {
    'NVDA': 140.00, 'AAPL': 235.00, 'MSFT': 425.00, 'GOOG': 175.00,
    'AMZN': 195.00, 'TSLA': 250.00, 'META': 530.00, 'NFLX': 700.00,
    'AMD': 160.00, 'INTC': 23.00, 'PYPL': 84.00, 'GME': 25.00,
    'AMC': 5.00, 'PLTR': 42.00, 'COIN': 180.00, 'HOOD': 22.00,
    'SPY': 580.00, 'QQQ': 500.00, 'V': 285.00, 'MA': 460.00,
    'JPM': 220.00, 'DIS': 100.00, 'BA': 160.00, 'CRM': 300.00,
    'UBER': 75.00, 'ABNB': 140.00, 'SBUX': 95.00, 'NKE': 85.00
};

// Company name mapping
const COMPANY_NAMES = {
    'AAPL': 'Apple Inc.', 'MSFT': 'Microsoft Corporation', 'GOOG': 'Alphabet Inc.',
    'AMZN': 'Amazon.com Inc.', 'TSLA': 'Tesla, Inc.', 'NVDA': 'NVIDIA Corporation',
    'META': 'Meta Platforms, Inc.', 'GME': 'GameStop Corp.', 'AMC': 'AMC Entertainment',
    'PLTR': 'Palantir Technologies', 'PYPL': 'PayPal Holdings', 'NFLX': 'Netflix, Inc.',
    'AMD': 'Advanced Micro Devices', 'INTC': 'Intel Corporation', 'SPY': 'SPDR S&P 500 ETF',
    'QQQ': 'Invesco QQQ Trust', 'V': 'Visa Inc.', 'MA': 'Mastercard Inc.',
    'JPM': 'JPMorgan Chase & Co.', 'DIS': 'Walt Disney Company', 'BA': 'Boeing Company',
    'COIN': 'Coinbase Global', 'HOOD': 'Robinhood Markets', 'CRM': 'Salesforce',
    'UBER': 'Uber Technologies', 'ABNB': 'Airbnb, Inc.', 'SBUX': 'Starbucks Corp.',
    'NKE': 'Nike, Inc.'
};

// Fetch from Yahoo Finance with proxy rotation
async function fetchYahooData(ticker) {
    const symbol = ticker.toUpperCase();
    const targetUrl = `${YAHOO_BASE_URL}${symbol}?interval=1d&range=5y`;

    for (const proxy of PROXIES) {
        try {
            const encodedUrl = encodeURIComponent(targetUrl);
            const proxiedUrl = `${proxy}${encodedUrl}`;

            const response = await fetch(proxiedUrl, {
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                }
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

            const timestamps = result.timestamp || [];
            const quote = result.indicators?.quote?.[0] || {};
            const closes = quote.close || [];

            const history = [];
            for (let i = 0; i < timestamps.length; i++) {
                if (timestamps[i] && closes[i] !== null && closes[i] !== undefined) {
                    history.push({
                        date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
                        price: parseFloat(closes[i].toFixed(2))
                    });
                }
            }

            return { price: currentPrice, history, companyName: meta.longName || `${symbol} Corp.` };

        } catch (error) {
            continue;
        }
    }

    return null;
}

// Get stock data (price and history)
router.get('/:ticker', authenticateToken, async (req, res) => {
    try {
        const ticker = req.params.ticker.toUpperCase();

        // Check cache first
        let history = priceHistoryOps.get(ticker);
        let currentPrice = null;
        let companyName = COMPANY_NAMES[ticker] || `${ticker} Corp.`;

        if (!history) {
            // Fetch from Yahoo Finance
            const data = await fetchYahooData(ticker);

            if (data) {
                currentPrice = data.price;
                history = data.history;
                companyName = data.companyName;

                // Cache the results
                priceHistoryOps.set(ticker, history);
            } else {
                // Use fallback
                currentPrice = FALLBACK_PRICES[ticker] || 100.00;
                history = generateMockHistory(ticker, currentPrice);
            }
        } else {
            // We have cached history, but still need current price
            // In production, you'd fetch just the current price, but for simplicity:
            currentPrice = history[history.length - 1]?.price || FALLBACK_PRICES[ticker] || 100.00;
        }

        res.json({
            ticker,
            currentPrice,
            companyName,
            history
        });
    } catch (error) {
        console.error('Error fetching stock data:', error);
        res.status(500).json({ error: 'Failed to fetch stock data' });
    }
});

// Get only current price (lighter endpoint)
router.get('/:ticker/price', authenticateToken, async (req, res) => {
    try {
        const ticker = req.params.ticker.toUpperCase();

        const data = await fetchYahooData(ticker);
        const currentPrice = data?.price || FALLBACK_PRICES[ticker] || 100.00;

        res.json({
            ticker,
            currentPrice
        });
    } catch (error) {
        console.error('Error fetching current price:', error);
        res.status(500).json({ error: 'Failed to fetch current price' });
    }
});

// Generate mock history as fallback
function generateMockHistory(ticker, currentPrice) {
    const history = [];
    const now = Date.now();
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    let price = currentPrice;
    const seed = ticker.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

    const seededRandom = (s) => {
        const x = Math.sin(s++) * 10000;
        return x - Math.floor(x);
    };

    for (let i = 0; i < 365 * 5; i++) {
        const date = new Date(now - (i * ONE_DAY_MS));
        history.push({
            date: date.toISOString().split('T')[0],
            price: parseFloat(price.toFixed(2))
        });

        const randomChange = (seededRandom(seed + i) - 0.45) * 2.5;
        const factor = 1 + (randomChange / 100);
        price = price / factor;
        if (price < 0.1) price = 0.1;
    }

    return history.reverse();
}

module.exports = router;
