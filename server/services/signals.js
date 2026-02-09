const { getOHLCV, getTicker } = require('./kraken');
const { rsi, macd, bollingerBands } = require('./indicators');
const { getDB } = require('../db/init');

const PAIRS = ['BTC/EUR', 'ETH/EUR'];

async function generateSignal(pair) {
    const candles = await getOHLCV(pair, 60); // 1h candles
    if (candles.length < 30) return null;

    const closes = candles.map(c => c.close);
    const currentPrice = closes[closes.length - 1];

    // Calculate indicators
    const rsiValues = rsi(closes, 14);
    const currentRSI = rsiValues[rsiValues.length - 1];

    const macdResult = macd(closes, 12, 26, 9);
    const currentMACD = macdResult.macdLine[macdResult.macdLine.length - 1];
    const currentMACDSignal = macdResult.signalLine[macdResult.signalLine.length - 1];

    const bb = bollingerBands(closes, 20, 2);
    const bbUpper = bb.upper[bb.upper.length - 1];
    const bbLower = bb.lower[bb.lower.length - 1];

    // Signal scoring
    let score = 0;
    const signals = [];

    // RSI signals
    if (currentRSI !== null) {
        if (currentRSI < 30) { score += 2; signals.push('RSI oversold'); }
        else if (currentRSI < 40) { score += 1; signals.push('RSI low'); }
        else if (currentRSI > 70) { score -= 2; signals.push('RSI overbought'); }
        else if (currentRSI > 60) { score -= 1; signals.push('RSI high'); }
    }

    // MACD signals
    if (currentMACD !== null && currentMACDSignal !== null) {
        if (currentMACD > currentMACDSignal) { score += 1.5; signals.push('MACD bullish'); }
        else { score -= 1.5; signals.push('MACD bearish'); }
        // MACD crossover
        const prevMACD = macdResult.macdLine[macdResult.macdLine.length - 2];
        const prevSignal = macdResult.signalLine[macdResult.signalLine.length - 2];
        if (prevMACD !== null && prevSignal !== null) {
            if (prevMACD < prevSignal && currentMACD > currentMACDSignal) { score += 2; signals.push('MACD bullish cross'); }
            if (prevMACD > prevSignal && currentMACD < currentMACDSignal) { score -= 2; signals.push('MACD bearish cross'); }
        }
    }

    // Bollinger Band signals
    if (bbUpper !== null && bbLower !== null) {
        const bbWidth = bbUpper - bbLower;
        const bbPosition = (currentPrice - bbLower) / bbWidth;
        if (bbPosition < 0.1) { score += 2; signals.push('Near BB lower'); }
        else if (bbPosition < 0.3) { score += 1; signals.push('Below BB middle'); }
        else if (bbPosition > 0.9) { score -= 2; signals.push('Near BB upper'); }
        else if (bbPosition > 0.7) { score -= 1; signals.push('Above BB middle'); }
    }

    // Determine direction and confidence
    let direction, confidence;
    const absScore = Math.abs(score);

    if (absScore < 1.5) {
        direction = 'hold';
        confidence = 30 + Math.random() * 20;
    } else if (score > 0) {
        direction = 'long';
        confidence = Math.min(95, 55 + absScore * 6 + Math.random() * 10);
    } else {
        direction = 'short';
        confidence = Math.min(95, 55 + absScore * 6 + Math.random() * 10);
    }

    confidence = parseFloat(confidence.toFixed(1));

    // Store in database
    const db = getDB();
    const result = db.prepare(`
        INSERT INTO signals (pair, direction, confidence, price_at_signal, rsi, macd, macd_signal, bb_upper, bb_lower)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(pair, direction, confidence, currentPrice, currentRSI, currentMACD, currentMACDSignal, bbUpper, bbLower);

    return {
        id: result.lastInsertRowid,
        pair,
        direction,
        confidence,
        price: currentPrice,
        indicators: { rsi: currentRSI?.toFixed(1), macd: currentMACD?.toFixed(4), bb_upper: bbUpper?.toFixed(2), bb_lower: bbLower?.toFixed(2) },
        reasons: signals,
    };
}

async function generateAllSignals() {
    const results = {};
    for (const pair of PAIRS) {
        try {
            results[pair] = await generateSignal(pair);
        } catch (err) {
            console.error(`Signal generation failed for ${pair}:`, err.message);
            results[pair] = null;
        }
    }
    return results;
}

let signalInterval = null;

function startSignalEngine(wss) {
    const interval = parseInt(process.env.SIGNAL_INTERVAL) || 60000;
    console.log(`Signal engine started (interval: ${interval}ms)`);

    async function run() {
        try {
            const signals = await generateAllSignals();
            // Broadcast to WebSocket clients
            if (wss) {
                const msg = JSON.stringify({ type: 'signals', data: signals });
                wss.clients.forEach(client => {
                    if (client.readyState === 1) client.send(msg);
                });
            }
            console.log('Signals generated:', Object.entries(signals).map(([p, s]) => s ? `${p}: ${s.direction} (${s.confidence}%)` : `${p}: failed`).join(', '));
        } catch (err) {
            console.error('Signal engine error:', err.message);
        }
    }

    // Run immediately then on interval
    run();
    signalInterval = setInterval(run, interval);
}

function getLatestSignals() {
    const db = getDB();
    const signals = {};
    for (const pair of PAIRS) {
        signals[pair] = db.prepare('SELECT * FROM signals WHERE pair = ? ORDER BY created_at DESC LIMIT 1').get(pair);
    }
    return signals;
}

function getSignalHistory(pair, limit = 24) {
    const db = getDB();
    return db.prepare('SELECT * FROM signals WHERE pair = ? ORDER BY created_at DESC LIMIT ?').all(pair, limit);
}

module.exports = { startSignalEngine, generateAllSignals, getLatestSignals, getSignalHistory };
