const express = require('express');
const { getTicker, getOHLCV, getOrderBook } = require('../services/kraken');

const router = express.Router();

// GET /api/market/ticker - Get live ticker data
router.get('/ticker', async (req, res) => {
    try {
        const pairs = req.query.pairs ? req.query.pairs.split(',') : ['BTC/EUR', 'ETH/EUR'];
        const tickers = await getTicker(pairs);
        res.json({ tickers });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/market/ohlcv/:pair - Get OHLCV candle data
router.get('/ohlcv/:pair', async (req, res) => {
    try {
        const pair = req.params.pair.replace('-', '/');
        const interval = parseInt(req.query.interval) || 60;
        const candles = await getOHLCV(pair, interval);
        res.json({ pair, interval, candles });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/market/orderbook/:pair - Get order book
router.get('/orderbook/:pair', async (req, res) => {
    try {
        const pair = req.params.pair.replace('-', '/');
        const count = parseInt(req.query.count) || 10;
        const orderbook = await getOrderBook(pair, count);
        res.json({ pair, ...orderbook });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
