// Technical indicator calculations from OHLCV data

function sma(data, period) {
    const result = [];
    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) { result.push(null); continue; }
        const slice = data.slice(i - period + 1, i + 1);
        result.push(slice.reduce((a, b) => a + b, 0) / period);
    }
    return result;
}

function ema(data, period) {
    const result = [];
    const multiplier = 2 / (period + 1);
    let prev = null;
    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) { result.push(null); continue; }
        if (prev === null) {
            prev = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
            result.push(prev);
        } else {
            prev = (data[i] - prev) * multiplier + prev;
            result.push(prev);
        }
    }
    return result;
}

function rsi(closes, period = 14) {
    const result = [];
    let avgGain = 0, avgLoss = 0;

    for (let i = 0; i < closes.length; i++) {
        if (i === 0) { result.push(null); continue; }

        const change = closes[i] - closes[i - 1];
        const gain = change > 0 ? change : 0;
        const loss = change < 0 ? -change : 0;

        if (i <= period) {
            avgGain += gain / period;
            avgLoss += loss / period;
            if (i < period) { result.push(null); continue; }
        } else {
            avgGain = (avgGain * (period - 1) + gain) / period;
            avgLoss = (avgLoss * (period - 1) + loss) / period;
        }

        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        result.push(100 - (100 / (1 + rs)));
    }
    return result;
}

function macd(closes, fast = 12, slow = 26, signal = 9) {
    const emaFast = ema(closes, fast);
    const emaSlow = ema(closes, slow);

    const macdLine = emaFast.map((f, i) => (f !== null && emaSlow[i] !== null) ? f - emaSlow[i] : null);
    const validMacd = macdLine.filter(v => v !== null);
    const signalLine = ema(validMacd, signal);

    // Pad signal line to match macd length
    const padded = new Array(macdLine.length - validMacd.length).fill(null);
    const paddedSignal = [...padded, ...new Array(validMacd.length - signalLine.length).fill(null), ...signalLine];

    const histogram = macdLine.map((m, i) => (m !== null && paddedSignal[i] !== null) ? m - paddedSignal[i] : null);

    return { macdLine, signalLine: paddedSignal, histogram };
}

function bollingerBands(closes, period = 20, stdDev = 2) {
    const middle = sma(closes, period);
    const upper = [];
    const lower = [];

    for (let i = 0; i < closes.length; i++) {
        if (middle[i] === null) { upper.push(null); lower.push(null); continue; }
        const slice = closes.slice(i - period + 1, i + 1);
        const mean = middle[i];
        const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
        const std = Math.sqrt(variance);
        upper.push(mean + stdDev * std);
        lower.push(mean - stdDev * std);
    }

    return { upper, middle, lower };
}

module.exports = { sma, ema, rsi, macd, bollingerBands };
