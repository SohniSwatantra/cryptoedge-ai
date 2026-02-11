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

// ADX (Average Directional Index) - trend strength
function adx(highs, lows, closes, period = 14) {
    if (closes.length < period + 1) return { adx: null, plusDI: null, minusDI: null };

    const trueRanges = [];
    const plusDMs = [];
    const minusDMs = [];

    for (let i = 1; i < closes.length; i++) {
        const high = highs[i], low = lows[i], prevClose = closes[i - 1];
        const prevHigh = highs[i - 1], prevLow = lows[i - 1];

        trueRanges.push(Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose)));

        const upMove = high - prevHigh;
        const downMove = prevLow - low;
        plusDMs.push(upMove > downMove && upMove > 0 ? upMove : 0);
        minusDMs.push(downMove > upMove && downMove > 0 ? downMove : 0);
    }

    // Smoothed averages using Wilder's method
    let atr = trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period;
    let smoothPlusDM = plusDMs.slice(0, period).reduce((a, b) => a + b, 0) / period;
    let smoothMinusDM = minusDMs.slice(0, period).reduce((a, b) => a + b, 0) / period;

    const dxValues = [];
    for (let i = period; i < trueRanges.length; i++) {
        atr = (atr * (period - 1) + trueRanges[i]) / period;
        smoothPlusDM = (smoothPlusDM * (period - 1) + plusDMs[i]) / period;
        smoothMinusDM = (smoothMinusDM * (period - 1) + minusDMs[i]) / period;

        const plusDI = atr > 0 ? (smoothPlusDM / atr) * 100 : 0;
        const minusDI = atr > 0 ? (smoothMinusDM / atr) * 100 : 0;
        const diSum = plusDI + minusDI;
        dxValues.push(diSum > 0 ? Math.abs(plusDI - minusDI) / diSum * 100 : 0);
    }

    if (dxValues.length < period) return { adx: null, plusDI: null, minusDI: null };

    let adxVal = dxValues.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < dxValues.length; i++) {
        adxVal = (adxVal * (period - 1) + dxValues[i]) / period;
    }

    const lastATR = atr;
    const lastPlusDI = lastATR > 0 ? (smoothPlusDM / lastATR) * 100 : 0;
    const lastMinusDI = lastATR > 0 ? (smoothMinusDM / lastATR) * 100 : 0;

    return { adx: adxVal, plusDI: lastPlusDI, minusDI: lastMinusDI };
}

// Stochastic Oscillator
function stochastic(highs, lows, closes, kPeriod = 14, dPeriod = 3) {
    const kValues = [];
    for (let i = 0; i < closes.length; i++) {
        if (i < kPeriod - 1) { kValues.push(null); continue; }
        const highSlice = highs.slice(i - kPeriod + 1, i + 1);
        const lowSlice = lows.slice(i - kPeriod + 1, i + 1);
        const highestHigh = Math.max(...highSlice);
        const lowestLow = Math.min(...lowSlice);
        const range = highestHigh - lowestLow;
        kValues.push(range > 0 ? ((closes[i] - lowestLow) / range) * 100 : 50);
    }

    const validK = kValues.filter(v => v !== null);
    const dValues = sma(validK, dPeriod);
    const lastK = validK.length > 0 ? validK[validK.length - 1] : null;
    const lastD = dValues.length > 0 ? dValues[dValues.length - 1] : null;

    return { k: lastK, d: lastD };
}

// ATR (Average True Range)
function atr(highs, lows, closes, period = 14) {
    if (closes.length < period + 1) return null;

    const trueRanges = [];
    for (let i = 1; i < closes.length; i++) {
        trueRanges.push(Math.max(
            highs[i] - lows[i],
            Math.abs(highs[i] - closes[i - 1]),
            Math.abs(lows[i] - closes[i - 1])
        ));
    }

    let atrVal = trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < trueRanges.length; i++) {
        atrVal = (atrVal * (period - 1) + trueRanges[i]) / period;
    }
    return atrVal;
}

// OBV (On Balance Volume)
function obv(closes, volumes) {
    let obvVal = 0;
    const result = [0];
    for (let i = 1; i < closes.length; i++) {
        if (closes[i] > closes[i - 1]) obvVal += volumes[i];
        else if (closes[i] < closes[i - 1]) obvVal -= volumes[i];
        result.push(obvVal);
    }
    // Return trend: compare last OBV to 10-period SMA of OBV
    const recentOBV = result.slice(-10);
    const obvSMA = recentOBV.reduce((a, b) => a + b, 0) / recentOBV.length;
    const lastOBV = result[result.length - 1];
    return { value: lastOBV, trend: lastOBV > obvSMA ? 'rising' : 'falling' };
}

// MFI (Money Flow Index) - volume-weighted RSI
function mfi(highs, lows, closes, volumes, period = 14) {
    if (closes.length < period + 1) return null;

    const typicalPrices = closes.map((c, i) => (highs[i] + lows[i] + c) / 3);
    let posFlow = 0, negFlow = 0;

    for (let i = 1; i <= period; i++) {
        const mf = typicalPrices[i] * volumes[i];
        if (typicalPrices[i] > typicalPrices[i - 1]) posFlow += mf;
        else negFlow += mf;
    }

    // Use rolling window for remaining periods
    for (let i = period + 1; i < closes.length; i++) {
        const mf = typicalPrices[i] * volumes[i];
        if (typicalPrices[i] > typicalPrices[i - 1]) posFlow += mf;
        else negFlow += mf;

        const oldMF = typicalPrices[i - period] * volumes[i - period];
        if (typicalPrices[i - period] > typicalPrices[i - period - 1]) posFlow -= oldMF;
        else negFlow -= oldMF;
    }

    if (negFlow === 0) return 100;
    const ratio = posFlow / negFlow;
    return 100 - (100 / (1 + ratio));
}

// Volume Ratio (current volume vs 20-period average)
function volumeRatio(volumes, period = 20) {
    if (volumes.length < period) return null;
    const recent = volumes.slice(-period);
    const avg = recent.reduce((a, b) => a + b, 0) / period;
    const current = volumes[volumes.length - 1];
    return avg > 0 ? current / avg : null;
}

// Support and Resistance levels from swing highs/lows
function supportResistance(highs, lows, lookback = 50) {
    const recentHighs = highs.slice(-lookback);
    const recentLows = lows.slice(-lookback);

    // Find swing highs (local maxima) and swing lows (local minima)
    const swingHighs = [];
    const swingLows = [];

    for (let i = 2; i < recentHighs.length - 2; i++) {
        if (recentHighs[i] > recentHighs[i - 1] && recentHighs[i] > recentHighs[i - 2] &&
            recentHighs[i] > recentHighs[i + 1] && recentHighs[i] > recentHighs[i + 2]) {
            swingHighs.push(recentHighs[i]);
        }
        if (recentLows[i] < recentLows[i - 1] && recentLows[i] < recentLows[i - 2] &&
            recentLows[i] < recentLows[i + 1] && recentLows[i] < recentLows[i + 2]) {
            swingLows.push(recentLows[i]);
        }
    }

    // Return nearest resistance (above) and support (below) relative to last close
    const resistance = swingHighs.length > 0 ? Math.max(...swingHighs.slice(-3)) : null;
    const support = swingLows.length > 0 ? Math.min(...swingLows.slice(-3)) : null;

    return { resistance, support };
}

// Compute all indicators from candle data
function computeAllIndicators(candles) {
    const closes = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const volumes = candles.map(c => c.volume);

    // Existing indicators
    const rsiValues = rsi(closes, 14);
    const currentRSI = rsiValues[rsiValues.length - 1];

    const macdResult = macd(closes, 12, 26, 9);
    const currentMACD = macdResult.macdLine[macdResult.macdLine.length - 1];
    const currentMACDSignal = macdResult.signalLine[macdResult.signalLine.length - 1];
    const currentMACDHist = macdResult.histogram[macdResult.histogram.length - 1];

    const bb = bollingerBands(closes, 20, 2);
    const bbUpper = bb.upper[bb.upper.length - 1];
    const bbMiddle = bb.middle[bb.middle.length - 1];
    const bbLower = bb.lower[bb.lower.length - 1];
    const bbPosition = (bbUpper && bbLower && bbUpper !== bbLower)
        ? (closes[closes.length - 1] - bbLower) / (bbUpper - bbLower) : null;

    // EMA crossovers
    const ema20 = ema(closes, 20);
    const ema50 = ema(closes, 50);
    const ema200 = ema(closes, 200);
    const currentEMA20 = ema20[ema20.length - 1];
    const currentEMA50 = ema50[ema50.length - 1];
    const currentEMA200 = ema200[ema200.length - 1];

    // New indicators
    const adxResult = adx(highs, lows, closes, 14);
    const stochResult = stochastic(highs, lows, closes, 14, 3);
    const currentATR = atr(highs, lows, closes, 14);
    const obvResult = obv(closes, volumes);
    const currentMFI = mfi(highs, lows, closes, volumes, 14);
    const volRatio = volumeRatio(volumes, 20);
    const levels = supportResistance(highs, lows, 50);

    // VWAP from candle data
    const lastCandle = candles[candles.length - 1];
    const currentVWAP = lastCandle ? lastCandle.vwap : null;

    // Recent price action (last 12 candles)
    const recentCloses = closes.slice(-12);
    const recentVolumes = volumes.slice(-12);

    return {
        price: closes[closes.length - 1],
        rsi: currentRSI,
        macd: { line: currentMACD, signal: currentMACDSignal, histogram: currentMACDHist },
        bollingerBands: { upper: bbUpper, middle: bbMiddle, lower: bbLower, position: bbPosition },
        ema: {
            ema20: currentEMA20,
            ema50: currentEMA50,
            ema200: currentEMA200,
            ema20AboveEma50: currentEMA20 && currentEMA50 ? currentEMA20 > currentEMA50 : null,
            ema50AboveEma200: currentEMA50 && currentEMA200 ? currentEMA50 > currentEMA200 : null,
        },
        adx: adxResult,
        stochastic: stochResult,
        atr: currentATR,
        obv: obvResult,
        mfi: currentMFI,
        volumeRatio: volRatio,
        vwap: currentVWAP,
        supportResistance: levels,
        recentCloses,
        recentVolumes,
    };
}

module.exports = { sma, ema, rsi, macd, bollingerBands, adx, stochastic, atr, obv, mfi, volumeRatio, supportResistance, computeAllIndicators };
