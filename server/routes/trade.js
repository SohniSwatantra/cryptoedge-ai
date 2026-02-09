const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { openPosition, closePosition, getOpenPositions, getTradeHistory } = require('../services/paperTrading');

const router = express.Router();

// All trade routes require auth
router.use(authMiddleware);

// POST /api/trade/open - Open a new position
router.post('/open', async (req, res) => {
    try {
        const { pair, direction, quantity, stop_loss, take_profit, confidence } = req.body;

        if (!pair || !direction || !quantity) {
            return res.status(400).json({ error: 'pair, direction, and quantity are required' });
        }
        if (!['long', 'short'].includes(direction)) {
            return res.status(400).json({ error: 'direction must be "long" or "short"' });
        }
        if (quantity <= 0) {
            return res.status(400).json({ error: 'quantity must be positive' });
        }

        const trade = await openPosition(req.user.id, { pair, direction, quantity, stop_loss, take_profit, confidence });
        res.status(201).json({ trade });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// POST /api/trade/close/:id - Close an open position
router.post('/close/:id', async (req, res) => {
    try {
        const trade = await closePosition(req.user.id, parseInt(req.params.id));
        res.json({ trade });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// GET /api/trade/positions - Get open positions
router.get('/positions', (req, res) => {
    const positions = getOpenPositions(req.user.id);
    res.json({ positions });
});

// GET /api/trade/history - Get trade history
router.get('/history', (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const trades = getTradeHistory(req.user.id, limit);
    res.json({ trades });
});

module.exports = router;
