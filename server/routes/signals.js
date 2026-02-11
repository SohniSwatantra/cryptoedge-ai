const express = require('express');
const { getLatestSignals, getSignalHistory } = require('../services/signals');
const { getRecentErrors } = require('../services/logger');
const { authMiddleware } = require('../middleware/auth');

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

// GET /api/admin/errors - View recent error logs (auth-protected)
router.get('/admin/errors', authMiddleware, (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const errors = getRecentErrors(limit);
    res.json({ errors, count: errors.length });
});

module.exports = router;
