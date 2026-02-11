const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { getPortfolioSummary } = require('../services/paperTrading');

const router = express.Router();

router.use(authMiddleware);

// GET /api/portfolio/summary
router.get('/summary', (req, res) => {
    try {
        const summary = getPortfolioSummary(req.user.id);
        res.json({ summary });
    } catch (err) {
        res.status(err.message === 'User not found' ? 404 : 500).json({ error: err.message });
    }
});

module.exports = router;
