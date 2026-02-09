const express = require('express');
const { krakenPrivate } = require('../services/kraken');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Middleware: check live trading is enabled
function requireLiveTrading(req, res, next) {
    if (process.env.LIVE_TRADING_ENABLED !== 'true') {
        return res.status(403).json({ error: 'Live trading is disabled. Set LIVE_TRADING_ENABLED=true in .env and provide Kraken API credentials.' });
    }
    next();
}

router.use(requireLiveTrading);

// GET /api/kraken/balance - Get account balance
router.get('/balance', async (req, res) => {
    try {
        const balance = await krakenPrivate('Balance');
        res.json({ balance });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/kraken/order - Place an order
router.post('/order', async (req, res) => {
    try {
        const { pair, type, ordertype, volume, price } = req.body;
        if (!pair || !type || !ordertype || !volume) {
            return res.status(400).json({ error: 'pair, type (buy/sell), ordertype (market/limit), and volume are required' });
        }
        const params = { pair, type, ordertype, volume };
        if (price) params.price = price;

        const result = await krakenPrivate('AddOrder', params);
        res.json({ order: result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/kraken/order/:txid - Cancel an order
router.delete('/order/:txid', async (req, res) => {
    try {
        const result = await krakenPrivate('CancelOrder', { txid: req.params.txid });
        res.json({ result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/kraken/open-orders - Get open orders
router.get('/open-orders', async (req, res) => {
    try {
        const result = await krakenPrivate('OpenOrders');
        res.json({ orders: result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
