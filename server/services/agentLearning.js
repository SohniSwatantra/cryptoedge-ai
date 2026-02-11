const fs = require('fs');
const path = require('path');
const { getDB } = require('../db/init');

const LEARNING_FILE = path.join(
    path.dirname(process.env.DB_PATH || './data/cryptoedge.db'),
    'agent-learning.md'
);

/**
 * Analyze all closed trades joined with the signal that was active at trade open time.
 * Rebuilds the learning file with win/loss patterns the LLM can use.
 */
function rebuildLearnings() {
    const db = getDB();

    const closedTrades = db.prepare(`
        SELECT t.*, s.rsi, s.macd, s.macd_signal, s.bb_upper, s.bb_lower,
               s.confidence as signal_confidence, s.market_sentiment, s.risk_level,
               s.analysis_source
        FROM trades t
        LEFT JOIN signals s ON s.pair = t.pair
            AND s.created_at = (
                SELECT MAX(s2.created_at) FROM signals s2
                WHERE s2.pair = t.pair AND s2.created_at <= t.created_at
            )
        WHERE t.status = 'closed' AND t.pnl IS NOT NULL
        ORDER BY t.closed_at DESC
    `).all();

    if (closedTrades.length === 0) {
        const content = '# Agent Learning Memory\n\nNo closed trades yet. No patterns to learn from.\n';
        ensureDir();
        fs.writeFileSync(LEARNING_FILE, content);
        return content;
    }

    const wins = closedTrades.filter(t => t.pnl > 0);
    const losses = closedTrades.filter(t => t.pnl <= 0);
    const totalPnl = closedTrades.reduce((s, t) => s + t.pnl, 0);

    // Stats by pair
    const byPair = {};
    for (const t of closedTrades) {
        if (!byPair[t.pair]) byPair[t.pair] = { wins: 0, losses: 0, pnl: 0 };
        if (t.pnl > 0) byPair[t.pair].wins++;
        else byPair[t.pair].losses++;
        byPair[t.pair].pnl += t.pnl;
    }

    // Stats by direction
    const byDir = { long: { wins: 0, losses: 0, pnl: 0 }, short: { wins: 0, losses: 0, pnl: 0 } };
    for (const t of closedTrades) {
        const d = byDir[t.direction] || byDir.long;
        if (t.pnl > 0) d.wins++;
        else d.losses++;
        d.pnl += t.pnl;
    }

    // Stats by RSI bucket
    const rsiBuckets = { oversold: { w: 0, l: 0 }, neutral: { w: 0, l: 0 }, overbought: { w: 0, l: 0 } };
    for (const t of closedTrades) {
        if (t.rsi == null) continue;
        const bucket = t.rsi < 30 ? 'oversold' : t.rsi > 70 ? 'overbought' : 'neutral';
        if (t.pnl > 0) rsiBuckets[bucket].w++;
        else rsiBuckets[bucket].l++;
    }

    // Stats by confidence bucket
    const confBuckets = { low: { w: 0, l: 0 }, mid: { w: 0, l: 0 }, high: { w: 0, l: 0 } };
    for (const t of closedTrades) {
        const c = t.signal_confidence || t.confidence;
        if (c == null) continue;
        const bucket = c < 50 ? 'low' : c < 70 ? 'mid' : 'high';
        if (t.pnl > 0) confBuckets[bucket].w++;
        else confBuckets[bucket].l++;
    }

    // Recent trades summary (last 10)
    const recent = closedTrades.slice(0, 10);

    // Build the learning file
    const lines = [];
    lines.push('# Agent Learning Memory');
    lines.push(`\nLast updated: ${new Date().toISOString()} | Total closed trades: ${closedTrades.length}\n`);

    lines.push('## Overall Performance');
    lines.push(`- Win rate: ${((wins.length / closedTrades.length) * 100).toFixed(1)}% (${wins.length}W / ${losses.length}L)`);
    lines.push(`- Total P&L: ${totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)} EUR\n`);

    lines.push('## Performance by Pair');
    for (const [pair, s] of Object.entries(byPair)) {
        const total = s.wins + s.losses;
        lines.push(`- ${pair}: ${((s.wins / total) * 100).toFixed(0)}% win rate (${s.wins}W/${s.losses}L), P&L: ${s.pnl >= 0 ? '+' : ''}${s.pnl.toFixed(2)}`);
    }

    lines.push('\n## Performance by Direction');
    for (const [dir, s] of Object.entries(byDir)) {
        const total = s.wins + s.losses;
        if (total === 0) continue;
        lines.push(`- ${dir.toUpperCase()}: ${((s.wins / total) * 100).toFixed(0)}% win rate (${s.wins}W/${s.losses}L), P&L: ${s.pnl >= 0 ? '+' : ''}${s.pnl.toFixed(2)}`);
    }

    lines.push('\n## Performance by RSI Zone at Entry');
    for (const [zone, s] of Object.entries(rsiBuckets)) {
        const total = s.w + s.l;
        if (total === 0) continue;
        lines.push(`- RSI ${zone} (<30 / 30-70 / >70): ${((s.w / total) * 100).toFixed(0)}% win rate (${s.w}W/${s.l}L)`);
    }

    lines.push('\n## Performance by Signal Confidence');
    for (const [level, s] of Object.entries(confBuckets)) {
        const total = s.w + s.l;
        if (total === 0) continue;
        const label = level === 'low' ? '<50%' : level === 'mid' ? '50-70%' : '>70%';
        lines.push(`- Confidence ${label}: ${((s.w / total) * 100).toFixed(0)}% win rate (${s.w}W/${s.l}L)`);
    }

    lines.push('\n## Recent Trades (last 10)');
    for (const t of recent) {
        const result = t.pnl > 0 ? 'WIN' : 'LOSS';
        lines.push(`- ${t.pair} ${t.direction.toUpperCase()} → ${result} (${t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)} EUR) | RSI: ${t.rsi?.toFixed(0) ?? '?'}, Conf: ${(t.signal_confidence || t.confidence)?.toFixed(0) ?? '?'}%`);
    }

    // Derive actionable lessons
    lines.push('\n## Key Lessons (auto-derived)');

    // Best direction
    const longWr = byDir.long.wins + byDir.long.losses > 0 ? byDir.long.wins / (byDir.long.wins + byDir.long.losses) : 0;
    const shortWr = byDir.short.wins + byDir.short.losses > 0 ? byDir.short.wins / (byDir.short.wins + byDir.short.losses) : 0;
    if (longWr > shortWr + 0.15 && byDir.long.wins + byDir.long.losses >= 3) {
        lines.push(`- LONG signals significantly outperform SHORT (${(longWr * 100).toFixed(0)}% vs ${(shortWr * 100).toFixed(0)}%). Favor LONG entries.`);
    } else if (shortWr > longWr + 0.15 && byDir.short.wins + byDir.short.losses >= 3) {
        lines.push(`- SHORT signals significantly outperform LONG (${(shortWr * 100).toFixed(0)}% vs ${(longWr * 100).toFixed(0)}%). Favor SHORT entries.`);
    }

    // Confidence calibration
    const highConf = confBuckets.high;
    if (highConf.w + highConf.l >= 3) {
        const highWr = highConf.w / (highConf.w + highConf.l);
        if (highWr < 0.5) {
            lines.push(`- WARNING: High confidence signals (>70%) only winning ${(highWr * 100).toFixed(0)}%. Model is overconfident. Raise threshold.`);
        } else if (highWr > 0.7) {
            lines.push(`- High confidence signals (>70%) performing well at ${(highWr * 100).toFixed(0)}% win rate. Trust them.`);
        }
    }

    // RSI extremes
    const oversold = rsiBuckets.oversold;
    if (oversold.w + oversold.l >= 3) {
        const wr = oversold.w / (oversold.w + oversold.l);
        if (wr > 0.65) lines.push(`- Oversold RSI (<30) entries have ${(wr * 100).toFixed(0)}% win rate. Good reversal signals.`);
        if (wr < 0.35) lines.push(`- Oversold RSI (<30) entries only ${(wr * 100).toFixed(0)}% win rate. Catching falling knives — avoid.`);
    }

    if (lines[lines.length - 1] === '\n## Key Lessons (auto-derived)') {
        lines.push('- Not enough data yet to derive lessons. Need at least 3 trades per category.');
    }

    const content = lines.join('\n') + '\n';
    ensureDir();
    fs.writeFileSync(LEARNING_FILE, content);
    console.log(`Agent learning updated: ${closedTrades.length} trades analyzed`);
    return content;
}

/**
 * Get the learning context to inject into the LLM prompt.
 * Returns empty string if no learning file exists.
 */
function getLearningContext() {
    try {
        if (fs.existsSync(LEARNING_FILE)) {
            return fs.readFileSync(LEARNING_FILE, 'utf8');
        }
    } catch (err) {
        console.error('Failed to read learning file:', err.message);
    }
    return '';
}

function ensureDir() {
    const dir = path.dirname(LEARNING_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

module.exports = { rebuildLearnings, getLearningContext };
