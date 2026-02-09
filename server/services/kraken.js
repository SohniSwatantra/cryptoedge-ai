const crypto = require('crypto');

const KRAKEN_API = process.env.KRAKEN_API_URL || 'https://api.kraken.com';

// Map friendly names to Kraken pair names
const PAIR_MAP = {
    'BTC/EUR': 'XXBTZEUR',
    'ETH/EUR': 'XETHZEUR',
    'BTC/USD': 'XXBTZUSD',
    'ETH/USD': 'XETHZUSD',
};

const REVERSE_PAIR_MAP = Object.fromEntries(Object.entries(PAIR_MAP).map(([k, v]) => [v, k]));

// In-memory cache
const cache = new Map();
const CACHE_TTL = 10000; // 10 seconds

function getCached(key) {
    const entry = cache.get(key);
    if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
    return null;
}

function setCache(key, data) {
    cache.set(key, { data, ts: Date.now() });
}

// Public API calls (no auth needed)
async function krakenPublic(endpoint, params = {}) {
    const url = new URL(`/0/public/${endpoint}`, KRAKEN_API);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const cacheKey = url.toString();
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const res = await fetch(url.toString());
    const data = await res.json();
    if (data.error && data.error.length > 0) {
        throw new Error(`Kraken API error: ${data.error.join(', ')}`);
    }
    setCache(cacheKey, data.result);
    return data.result;
}

// Get ticker data for pairs
async function getTicker(pairs = ['BTC/EUR', 'ETH/EUR']) {
    const krakenPairs = pairs.map(p => PAIR_MAP[p] || p).join(',');
    const result = await krakenPublic('Ticker', { pair: krakenPairs });

    const tickers = {};
    for (const [krakenPair, data] of Object.entries(result)) {
        const friendly = REVERSE_PAIR_MAP[krakenPair] || krakenPair;
        tickers[friendly] = {
            pair: friendly,
            price: parseFloat(data.c[0]),         // last trade price
            volume_24h: parseFloat(data.v[1]),     // 24h volume
            high_24h: parseFloat(data.h[1]),       // 24h high
            low_24h: parseFloat(data.l[1]),        // 24h low
            open_24h: parseFloat(data.o),          // 24h open
            trades_24h: parseInt(data.t[1]),       // 24h trades count
            vwap_24h: parseFloat(data.p[1]),       // 24h vwap
        };
        tickers[friendly].change_24h = ((tickers[friendly].price - tickers[friendly].open_24h) / tickers[friendly].open_24h * 100);
    }
    return tickers;
}

// Get OHLCV candle data
async function getOHLCV(pair = 'BTC/EUR', interval = 60) {
    const krakenPair = PAIR_MAP[pair] || pair;
    const result = await krakenPublic('OHLC', { pair: krakenPair, interval });

    const key = Object.keys(result).find(k => k !== 'last');
    if (!key) return [];

    return result[key].map(candle => ({
        time: candle[0],
        open: parseFloat(candle[1]),
        high: parseFloat(candle[2]),
        low: parseFloat(candle[3]),
        close: parseFloat(candle[4]),
        vwap: parseFloat(candle[5]),
        volume: parseFloat(candle[6]),
        count: candle[7],
    }));
}

// Get order book depth
async function getOrderBook(pair = 'BTC/EUR', count = 10) {
    const krakenPair = PAIR_MAP[pair] || pair;
    const result = await krakenPublic('Depth', { pair: krakenPair, count });

    const key = Object.keys(result)[0];
    return {
        asks: result[key].asks.map(([price, vol, ts]) => ({ price: parseFloat(price), volume: parseFloat(vol), timestamp: ts })),
        bids: result[key].bids.map(([price, vol, ts]) => ({ price: parseFloat(price), volume: parseFloat(vol), timestamp: ts })),
    };
}

// Private API signature generation (for live trading)
function getKrakenSignature(urlPath, data, secret) {
    const sha256 = crypto.createHash('sha256').update(data.nonce + new URLSearchParams(data).toString()).digest();
    const hmac = crypto.createHmac('sha512', Buffer.from(secret, 'base64'));
    hmac.update(Buffer.concat([Buffer.from(urlPath), sha256]));
    return hmac.digest('base64');
}

// Private API call (requires API key/secret)
async function krakenPrivate(endpoint, params = {}) {
    if (process.env.LIVE_TRADING_ENABLED !== 'true') {
        throw new Error('Live trading is disabled. Set LIVE_TRADING_ENABLED=true in .env');
    }
    if (!process.env.KRAKEN_API_KEY || !process.env.KRAKEN_API_SECRET) {
        throw new Error('Kraken API key and secret required for private endpoints');
    }

    const urlPath = `/0/private/${endpoint}`;
    const nonce = Date.now() * 1000;
    const data = { nonce, ...params };

    const signature = getKrakenSignature(urlPath, data, process.env.KRAKEN_API_SECRET);

    const res = await fetch(`${KRAKEN_API}${urlPath}`, {
        method: 'POST',
        headers: {
            'API-Key': process.env.KRAKEN_API_KEY,
            'API-Sign': signature,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(data).toString(),
    });
    const result = await res.json();
    if (result.error && result.error.length > 0) {
        throw new Error(`Kraken API error: ${result.error.join(', ')}`);
    }
    return result.result;
}

module.exports = {
    getTicker,
    getOHLCV,
    getOrderBook,
    krakenPrivate,
    PAIR_MAP,
    REVERSE_PAIR_MAP,
};
