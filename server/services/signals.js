const { getOHLCV, getTicker, getOrderBook } = require('./kraken');
const { computeAllIndicators } = require('./indicators');
const { analyzeMarket, isLLMAvailable } = require('./llmAnalysis');
const { fetchGlobalLiquidity } = require('./globalLiquidity');
const { logError } = require('./logger');
const { getDB } = require('../db/init');

const PAIRS = ['BTC/EUR', 'ETH/EUR'];

let isRunning = false; // Dedup guard

async function generateSignal(pair) {
    // Fetch all market data in parallel (including global liquidity)
    const [candles, tickerData, orderBook, globalLiquidity] = await Promise.all([
        getOHLCV(pair, 60),
        getTicker([pair]).then(t => t[pair]),
        getOrderBook(pair, 10),
        fetchGlobalLiquidity().catch(err => {
            logError('SIGNAL_WARN', `Global liquidity fetch failed: ${err.message}`);
            return null;
        }),
    ]);

    if (candles.length < 30) {
        throw new Error(`Insufficient candle data for ${pair}: ${candles.length} candles`);
    }

    // Compute all indicators
    const indicators = computeAllIndicators(candles);

    // Build market data package for LLM (now includes global liquidity)
    const marketData = { ticker: tickerData, indicators, orderBook, globalLiquidity };

    // Call LLM
    const analysis = await analyzeMarket(pair, marketData);

    // Store in database
    const db = getDB();
    const result = db.prepare(`
        INSERT INTO signals (
            pair, direction, confidence, price_at_signal,
            rsi, macd, macd_signal, bb_upper, bb_lower,
            analysis_text, market_sentiment, key_factors, risk_level,
            suggested_entry, suggested_stop_loss, suggested_take_profit,
            model_version, analysis_source, token_usage,
            global_liquidity_assessment
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        pair,
        analysis.direction,
        analysis.confidence,
        indicators.price,
        indicators.rsi,
        indicators.macd?.line,
        indicators.macd?.signal,
        indicators.bollingerBands?.upper,
        indicators.bollingerBands?.lower,
        analysis.analysis,
        analysis.market_sentiment,
        JSON.stringify(analysis.key_factors),
        analysis.risk_level,
        analysis.suggested_entry,
        analysis.suggested_stop_loss,
        analysis.suggested_take_profit,
        analysis.model_version,
        'llm',
        analysis.token_usage,
        analysis.global_liquidity_assessment || null
    );

    return {
        id: result.lastInsertRowid,
        pair,
        direction: analysis.direction,
        confidence: analysis.confidence,
        price: indicators.price,
        price_at_signal: indicators.price,
        indicators: {
            rsi: indicators.rsi?.toFixed(1),
            macd: indicators.macd?.line?.toFixed(4),
            bb_upper: indicators.bollingerBands?.upper?.toFixed(2),
            bb_lower: indicators.bollingerBands?.lower?.toFixed(2),
        },
        analysis_text: analysis.analysis,
        market_sentiment: analysis.market_sentiment,
        key_factors: analysis.key_factors,
        risk_level: analysis.risk_level,
        suggested_entry: analysis.suggested_entry,
        suggested_stop_loss: analysis.suggested_stop_loss,
        suggested_take_profit: analysis.suggested_take_profit,
        model_version: analysis.model_version,
        analysis_source: 'llm',
        technical_summary: analysis.technical_summary,
        global_liquidity_assessment: analysis.global_liquidity_assessment || null,
        long_score: analysis.long_score,
        short_score: analysis.short_score,
    };
}

async function generateAllSignals() {
    const results = {};
    for (const pair of PAIRS) {
        try {
            results[pair] = await generateSignal(pair);
        } catch (err) {
            logError('SIGNAL_ERROR', `${pair}: ${err.message}`);
            results[pair] = null;
        }
    }
    return results;
}

function broadcastError(wss, errorMessage) {
    if (!wss) return;
    // Never expose internal details to frontend
    const msg = JSON.stringify({
        type: 'signals',
        error: errorMessage,
        data: null,
    });
    wss.clients.forEach(client => {
        if (client.readyState === 1) client.send(msg);
    });
}

let signalInterval = null;
let storedWss = null;

function startSignalEngine(wss) {
    storedWss = wss;
    const interval = parseInt(process.env.SIGNAL_INTERVAL) || 300000;
    console.log(`Signal engine started (interval: ${interval}ms, LLM: ${isLLMAvailable() ? 'enabled' : 'disabled'})`);

    async function run() {
        // Check LLM availability
        if (!isLLMAvailable()) {
            if (!process.env.KIMI_API_KEY) {
                logError('SIGNAL_ERROR', 'KIMI_API_KEY not configured');
            }
            broadcastError(wss, 'Signal analysis temporarily unavailable');
            return;
        }

        // Dedup guard
        if (isRunning) {
            console.log('Signal generation skipped: previous run still active');
            return;
        }

        isRunning = true;
        try {
            const signals = await generateAllSignals();

            // Check if any signals succeeded
            const hasSignals = Object.values(signals).some(s => s !== null);

            if (hasSignals) {
                // Broadcast successful signals
                if (wss) {
                    const msg = JSON.stringify({ type: 'signals', data: signals });
                    wss.clients.forEach(client => {
                        if (client.readyState === 1) client.send(msg);
                    });
                }
                console.log('Signals generated:', Object.entries(signals).map(([p, s]) => s ? `${p}: ${s.direction} (${s.confidence}%)` : `${p}: failed`).join(', '));
            } else {
                broadcastError(wss, 'Signal analysis temporarily unavailable');
            }
        } catch (err) {
            logError('SIGNAL_ERROR', `Engine error: ${err.message}`);
            broadcastError(wss, 'Signal analysis temporarily unavailable');
        } finally {
            isRunning = false;
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
        // Parse key_factors JSON if present
        if (signals[pair]?.key_factors) {
            try { signals[pair].key_factors = JSON.parse(signals[pair].key_factors); } catch {}
        }
    }
    return signals;
}

function getSignalHistory(pair, limit = 24) {
    const db = getDB();
    const rows = db.prepare('SELECT * FROM signals WHERE pair = ? ORDER BY created_at DESC LIMIT ?').all(pair, limit);
    return rows.map(row => {
        if (row.key_factors) {
            try { row.key_factors = JSON.parse(row.key_factors); } catch {}
        }
        return row;
    });
}

/**
 * Manual refresh: generate fresh signals now and broadcast via WebSocket.
 * Returns the signals object or throws if LLM unavailable / already running.
 */
async function refreshSignals() {
    if (!isLLMAvailable()) {
        throw new Error('Signal analysis unavailable: LLM not configured');
    }
    if (isRunning) {
        throw new Error('Signal generation already in progress');
    }

    isRunning = true;
    try {
        const signals = await generateAllSignals();
        const hasSignals = Object.values(signals).some(s => s !== null);

        if (hasSignals && storedWss) {
            const msg = JSON.stringify({ type: 'signals', data: signals });
            storedWss.clients.forEach(client => {
                if (client.readyState === 1) client.send(msg);
            });
        }

        if (!hasSignals) throw new Error('All signal generations failed');

        console.log('Signals refreshed (manual):', Object.entries(signals).map(([p, s]) => s ? `${p}: ${s.direction} (${s.confidence}%)` : `${p}: failed`).join(', '));
        return signals;
    } finally {
        isRunning = false;
    }
}

module.exports = { startSignalEngine, generateAllSignals, refreshSignals, getLatestSignals, getSignalHistory };
