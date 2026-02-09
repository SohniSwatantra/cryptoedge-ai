const { getTicker } = require('./kraken');
const { getDB } = require('../db/init');
const { broadcast } = require('./websocket');

const PAIRS = ['BTC/EUR', 'ETH/EUR'];
const PRICE_INTERVAL = 15000; // 15 seconds

function startPriceFeed(wss) {
    console.log('Price feed started (interval: 15s)');

    async function fetchAndBroadcast() {
        try {
            const tickers = await getTicker(PAIRS);

            // Cache in database
            const db = getDB();
            const insert = db.prepare(`
                INSERT INTO price_cache (pair, price, volume_24h, high_24h, low_24h, change_24h)
                VALUES (?, ?, ?, ?, ?, ?)
            `);

            for (const [pair, data] of Object.entries(tickers)) {
                insert.run(pair, data.price, data.volume_24h, data.high_24h, data.low_24h, data.change_24h);
            }

            // Broadcast to WebSocket clients
            broadcast(wss, 'ticker', tickers);
        } catch (err) {
            console.error('Price feed error:', err.message);
        }
    }

    // Run immediately then on interval
    fetchAndBroadcast();
    setInterval(fetchAndBroadcast, PRICE_INTERVAL);
}

module.exports = { startPriceFeed };
