const express = require('express');
const { getLatestSignals, getSignalHistory } = require('../services/signals');

const router = express.Router();

// GET /api/signals/latest - Get latest signals (public)
router.get('/latest', (req, res) => {
    const signals = getLatestSignals();
    res.json({ signals });
});

// GET /api/signals/history/:pair - Get signal history
router.get('/history/:pair', (req, res) => {
    const pair = req.params.pair.replace('-', '/');
    const limit = parseInt(req.query.limit) || 24;
    const history = getSignalHistory(pair, limit);
    res.json({ pair, signals: history });
});

module.exports = router;
