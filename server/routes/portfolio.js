const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { getPortfolioSummary } = require('../services/paperTrading');

const router = express.Router();

router.use(authMiddleware);

// GET /api/portfolio/summary
router.get('/summary', (req, res) => {
    const summary = getPortfolioSummary(req.user.id);
    res.json({ summary });
});

module.exports = router;
