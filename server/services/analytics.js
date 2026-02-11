const { getDB } = require('../db/init');

/**
 * Compute per-user performance analytics from closed trades.
 */
function getUserAnalytics(userId) {
    const db = getDB();

    const trades = db.prepare(`
        SELECT t.*, s.rsi, s.macd, s.confidence as signal_confidence,
               s.market_sentiment, s.risk_level
        FROM trades t
        LEFT JOIN signals s ON s.pair = t.pair
            AND s.created_at = (
                SELECT MAX(s2.created_at) FROM signals s2
                WHERE s2.pair = t.pair AND s2.created_at <= t.created_at
            )
        WHERE t.user_id = ? AND t.status = 'closed' AND t.pnl IS NOT NULL
        ORDER BY t.closed_at ASC
    `).all(userId);

    const empty = {
        total_trades: 0, wins: 0, losses: 0, win_rate: 0, total_pnl: 0,
        donut: { wins: 0, losses: 0, breakeven: 0 },
        pnl_timeline: [],
        by_pair: {},
        by_direction: { long: { wins: 0, losses: 0, win_rate: 0 }, short: { wins: 0, losses: 0, win_rate: 0 } },
        confidence_calibration: [],
        recent_streak: { type: 'none', count: 0, last_10: [] }
    };

    if (trades.length === 0) return empty;

    // Basic stats
    const wins = trades.filter(t => t.pnl > 0).length;
    const losses = trades.filter(t => t.pnl < 0).length;
    const breakeven = trades.filter(t => t.pnl === 0).length;
    const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);

    // Donut
    const donut = { wins, losses, breakeven };

    // P&L timeline grouped by day
    const dayMap = {};
    let cumulative = 0;
    for (const t of trades) {
        const date = t.closed_at ? t.closed_at.split(/[T ]/)[0] : t.closed_at;
        if (!dayMap[date]) dayMap[date] = { date, pnl: 0 };
        dayMap[date].pnl += t.pnl;
    }
    const pnl_timeline = [];
    for (const day of Object.values(dayMap)) {
        cumulative += day.pnl;
        pnl_timeline.push({ date: day.date, pnl: parseFloat(day.pnl.toFixed(2)), cumulative_pnl: parseFloat(cumulative.toFixed(2)) });
    }

    // By pair
    const by_pair = {};
    for (const t of trades) {
        if (!by_pair[t.pair]) by_pair[t.pair] = { wins: 0, losses: 0, pnl: 0 };
        if (t.pnl > 0) by_pair[t.pair].wins++;
        else if (t.pnl < 0) by_pair[t.pair].losses++;
        by_pair[t.pair].pnl += t.pnl;
    }
    for (const p of Object.values(by_pair)) {
        const total = p.wins + p.losses;
        p.win_rate = total > 0 ? parseFloat(((p.wins / total) * 100).toFixed(1)) : 0;
        p.pnl = parseFloat(p.pnl.toFixed(2));
    }

    // By direction
    const by_direction = { long: { wins: 0, losses: 0 }, short: { wins: 0, losses: 0 } };
    for (const t of trades) {
        const d = by_direction[t.direction] || by_direction.long;
        if (t.pnl > 0) d.wins++;
        else if (t.pnl < 0) d.losses++;
    }
    for (const d of Object.values(by_direction)) {
        const total = d.wins + d.losses;
        d.win_rate = total > 0 ? parseFloat(((d.wins / total) * 100).toFixed(1)) : 0;
    }

    // Confidence calibration - 5 buckets
    const buckets = [
        { label: '<40', min: 0, max: 40 },
        { label: '40-55', min: 40, max: 55 },
        { label: '55-70', min: 55, max: 70 },
        { label: '70-85', min: 70, max: 85 },
        { label: '>85', min: 85, max: 101 }
    ];
    const confidence_calibration = buckets.map(b => {
        const inBucket = trades.filter(t => {
            const c = t.signal_confidence;
            return c != null && c >= b.min && c < b.max;
        });
        const bucketWins = inBucket.filter(t => t.pnl > 0).length;
        return {
            bucket: b.label,
            trades: inBucket.length,
            win_rate: inBucket.length > 0 ? parseFloat(((bucketWins / inBucket.length) * 100).toFixed(1)) : 0,
            expected_midpoint: (b.min + Math.min(b.max, 100)) / 2
        };
    });

    // Recent streak
    const last10 = trades.slice(-10).map(t => t.pnl > 0 ? 'win' : t.pnl < 0 ? 'loss' : 'even');
    let streakType = 'none';
    let streakCount = 0;
    if (last10.length > 0) {
        streakType = last10[last10.length - 1];
        streakCount = 1;
        for (let i = last10.length - 2; i >= 0; i--) {
            if (last10[i] === streakType) streakCount++;
            else break;
        }
    }

    return {
        total_trades: trades.length,
        wins,
        losses,
        win_rate: parseFloat(((wins / trades.length) * 100).toFixed(1)),
        total_pnl: parseFloat(totalPnl.toFixed(2)),
        donut,
        pnl_timeline,
        by_pair,
        by_direction,
        confidence_calibration,
        recent_streak: { type: streakType, count: streakCount, last_10: last10 }
    };
}

module.exports = { getUserAnalytics };
