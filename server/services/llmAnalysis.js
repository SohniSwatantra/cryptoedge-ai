const { logError } = require('./logger');
const { getLearningContext } = require('./agentLearning');

const KIMI_API_URL = process.env.KIMI_API_URL || 'https://api.moonshot.ai/v1/chat/completions';
const KIMI_MODEL_ID = process.env.KIMI_MODEL_ID || 'kimi-k2.5';
const LLM_TIMEOUT = parseInt(process.env.LLM_TIMEOUT) || 60000; // 60 seconds (K2.5 thinking mode needs time)

function isLLMAvailable() {
    if (process.env.LLM_SIGNAL_ENABLED === 'false') return false;
    return !!process.env.KIMI_API_KEY;
}

function buildSystemPrompt() {
    return `You are an expert crypto trading analyst operating like a Freqtrade strategy engine. You analyze multiple technical indicators with multi-factor confluence to generate trading signals.

Analysis framework (in priority order):
1. TREND CONTEXT: Check EMA alignment (20/50/200). Only trade in trend direction unless strong reversal signals.
2. TREND STRENGTH: ADX > 25 = strong trend (trust momentum), ADX < 20 = ranging (use mean-reversion).
3. MOMENTUM: RSI, Stochastic, MACD must align. Divergences between price and momentum = high-value signals.
4. VOLUME CONFIRMATION: Require volume ratio > 1.2 for entries. OBV trend must confirm price direction. MFI confirms money flow.
5. VOLATILITY: Use ATR for dynamic stop-loss (1.5-2x ATR) and take-profit (2-3x ATR). Bollinger Band position shows relative price level.
6. MICROSTRUCTURE: Order book imbalance > 0.6 favors that side. Spread indicates liquidity.
7. KEY LEVELS: Distance from support/resistance and VWAP influences entry quality.

Scoring rules:
- Need 2+ confirming factors for a directional signal (3+ for high confidence >70)
- Volume confirmation (volume ratio > 1.0) boosts confidence but is not required
- Never give confidence > 85 unless 5+ factors align
- Only hold if indicators across ALL categories genuinely conflict. Low-confidence directional (35-50%) is preferred over hold when there is any lean.

IMPORTANT: Use your past trading performance data below (if available) to calibrate your signals. Favor patterns that historically won, avoid patterns that historically lost. Adjust confidence based on actual track record, not just current indicators.

You MUST respond with ONLY valid JSON (no markdown, no explanation outside the JSON). Use this exact structure:
{
  "direction": "long" or "short" or "hold",
  "confidence": 30-95,
  "market_sentiment": "bullish" or "bearish" or "neutral",
  "risk_level": "low" or "medium" or "high",
  "analysis": "2-4 sentence market analysis",
  "key_factors": ["factor 1", "factor 2", "factor 3"],
  "technical_summary": "1-2 sentences on indicator state",
  "suggested_entry": price_number_or_null,
  "suggested_stop_loss": price_number_or_null,
  "suggested_take_profit": price_number_or_null
}`;
}

function buildUserPrompt(pair, marketData) {
    const { ticker, indicators, orderBook } = marketData;
    const ind = indicators;

    const sections = [];

    sections.push(`=== ${pair} Market Analysis Request ===`);

    // Ticker data
    if (ticker) {
        sections.push(`TICKER:
  Price: ${ticker.price}
  24h Change: ${ticker.change_24h?.toFixed(2)}%
  24h High: ${ticker.high_24h}
  24h Low: ${ticker.low_24h}
  24h Volume: ${ticker.volume_24h?.toFixed(2)}
  VWAP 24h: ${ticker.vwap_24h}
  Trade Count 24h: ${ticker.trades_24h}`);
    }

    // Trend indicators
    sections.push(`TREND:
  EMA 20: ${ind.ema?.ema20?.toFixed(2) ?? 'N/A'}
  EMA 50: ${ind.ema?.ema50?.toFixed(2) ?? 'N/A'}
  EMA 200: ${ind.ema?.ema200?.toFixed(2) ?? 'N/A'}
  EMA20 > EMA50: ${ind.ema?.ema20AboveEma50 ?? 'N/A'}
  EMA50 > EMA200: ${ind.ema?.ema50AboveEma200 ?? 'N/A'}`);

    // Momentum
    sections.push(`MOMENTUM:
  RSI(14): ${ind.rsi?.toFixed(2) ?? 'N/A'}
  Stochastic %K: ${ind.stochastic?.k?.toFixed(2) ?? 'N/A'}
  Stochastic %D: ${ind.stochastic?.d?.toFixed(2) ?? 'N/A'}
  MACD Line: ${ind.macd?.line?.toFixed(4) ?? 'N/A'}
  MACD Signal: ${ind.macd?.signal?.toFixed(4) ?? 'N/A'}
  MACD Histogram: ${ind.macd?.histogram?.toFixed(4) ?? 'N/A'}`);

    // Volatility
    sections.push(`VOLATILITY:
  BB Upper: ${ind.bollingerBands?.upper?.toFixed(2) ?? 'N/A'}
  BB Middle: ${ind.bollingerBands?.middle?.toFixed(2) ?? 'N/A'}
  BB Lower: ${ind.bollingerBands?.lower?.toFixed(2) ?? 'N/A'}
  BB Position: ${ind.bollingerBands?.position?.toFixed(3) ?? 'N/A'}
  ATR(14): ${ind.atr?.toFixed(2) ?? 'N/A'}`);

    // Volume
    sections.push(`VOLUME:
  OBV: ${ind.obv?.value?.toFixed(0) ?? 'N/A'} (${ind.obv?.trend ?? 'N/A'})
  MFI(14): ${ind.mfi?.toFixed(2) ?? 'N/A'}
  Volume Ratio (vs 20-avg): ${ind.volumeRatio?.toFixed(2) ?? 'N/A'}`);

    // Order book microstructure
    if (orderBook) {
        const bestBid = orderBook.bids?.[0]?.price;
        const bestAsk = orderBook.asks?.[0]?.price;
        const spread = bestBid && bestAsk ? ((bestAsk - bestBid) / bestAsk * 100).toFixed(4) : 'N/A';
        const bidDepth = orderBook.bids?.reduce((sum, b) => sum + b.volume, 0)?.toFixed(4) ?? 'N/A';
        const askDepth = orderBook.asks?.reduce((sum, a) => sum + a.volume, 0)?.toFixed(4) ?? 'N/A';
        const totalDepth = parseFloat(bidDepth) + parseFloat(askDepth);
        const imbalance = totalDepth > 0 ? (parseFloat(bidDepth) / totalDepth).toFixed(3) : 'N/A';

        sections.push(`ORDER BOOK:
  Best Bid: ${bestBid}
  Best Ask: ${bestAsk}
  Spread: ${spread}%
  Bid Depth: ${bidDepth}
  Ask Depth: ${askDepth}
  Imbalance (bid ratio): ${imbalance}`);
    }

    // Trend strength
    sections.push(`TREND STRENGTH:
  ADX: ${ind.adx?.adx?.toFixed(2) ?? 'N/A'}
  +DI: ${ind.adx?.plusDI?.toFixed(2) ?? 'N/A'}
  -DI: ${ind.adx?.minusDI?.toFixed(2) ?? 'N/A'}`);

    // Key levels
    sections.push(`KEY LEVELS:
  Support: ${ind.supportResistance?.support?.toFixed(2) ?? 'N/A'}
  Resistance: ${ind.supportResistance?.resistance?.toFixed(2) ?? 'N/A'}
  VWAP: ${ind.vwap?.toFixed(2) ?? 'N/A'}`);

    // Recent price action
    if (ind.recentCloses && ind.recentCloses.length > 0) {
        sections.push(`RECENT CLOSES (last ${ind.recentCloses.length}): ${ind.recentCloses.map(c => c.toFixed(2)).join(', ')}`);
    }
    if (ind.recentVolumes && ind.recentVolumes.length > 0) {
        sections.push(`RECENT VOLUMES (last ${ind.recentVolumes.length}): ${ind.recentVolumes.map(v => v.toFixed(4)).join(', ')}`);
    }

    return sections.join('\n\n');
}

function buildMessages(pair, marketData) {
    const messages = [
        { role: 'system', content: buildSystemPrompt() },
    ];

    // Inject learning context if available
    const learning = getLearningContext();
    if (learning && learning.length > 50) {
        messages.push({
            role: 'user',
            content: `=== YOUR PAST TRADING PERFORMANCE ===\n${learning}\n\nUse this track record to calibrate your signal. Now analyze the current market data below.`,
        });
        messages.push({
            role: 'assistant',
            content: 'Understood. I will factor in my past performance data when generating this signal.',
        });
    }

    messages.push({ role: 'user', content: buildUserPrompt(pair, marketData) });
    return messages;
}

function parseResponse(raw) {
    let text = raw.trim();

    // Strip markdown code fences if present
    if (text.startsWith('```')) {
        text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
    }

    let parsed;
    try {
        parsed = JSON.parse(text);
    } catch (err) {
        throw new Error(`Invalid JSON from LLM: ${err.message}`);
    }

    // Validate and sanitize
    const validDirections = ['long', 'short', 'hold'];
    const validSentiments = ['bullish', 'bearish', 'neutral'];
    const validRiskLevels = ['low', 'medium', 'high'];

    const direction = validDirections.includes(parsed.direction) ? parsed.direction : 'hold';
    const confidence = Math.min(95, Math.max(30, typeof parsed.confidence === 'number' ? parsed.confidence : 50));
    const market_sentiment = validSentiments.includes(parsed.market_sentiment) ? parsed.market_sentiment : 'neutral';
    const risk_level = validRiskLevels.includes(parsed.risk_level) ? parsed.risk_level : 'medium';

    return {
        direction,
        confidence: parseFloat(confidence.toFixed(1)),
        market_sentiment,
        risk_level,
        analysis: typeof parsed.analysis === 'string' ? parsed.analysis.slice(0, 500) : '',
        key_factors: Array.isArray(parsed.key_factors) ? parsed.key_factors.slice(0, 5).map(f => String(f).slice(0, 100)) : [],
        technical_summary: typeof parsed.technical_summary === 'string' ? parsed.technical_summary.slice(0, 300) : '',
        suggested_entry: typeof parsed.suggested_entry === 'number' ? parsed.suggested_entry : null,
        suggested_stop_loss: typeof parsed.suggested_stop_loss === 'number' ? parsed.suggested_stop_loss : null,
        suggested_take_profit: typeof parsed.suggested_take_profit === 'number' ? parsed.suggested_take_profit : null,
    };
}

async function analyzeMarket(pair, marketData) {
    if (!isLLMAvailable()) {
        throw new Error('LLM not available');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT);

    try {
        const response = await fetch(KIMI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.KIMI_API_KEY}`,
            },
            body: JSON.stringify({
                model: KIMI_MODEL_ID,
                messages: buildMessages(pair, marketData),
                temperature: 1,
                max_tokens: 4096,
            }),
            signal: controller.signal,
        });

        if (!response.ok) {
            const errorBody = await response.text().catch(() => '');
            logError('LLM_API', `${response.status} from ${KIMI_API_URL} model=${KIMI_MODEL_ID}: ${errorBody.slice(0, 300)}`);
            throw new Error(`API ${response.status}: ${errorBody.slice(0, 200)}`);
        }

        const data = await response.json();

        // Kimi K2.5 thinking mode: actual content may be in the last choice
        const content = data.choices?.[0]?.message?.content;
        if (!content) {
            throw new Error('Empty response from LLM');
        }

        const result = parseResponse(content);
        result.model_version = KIMI_MODEL_ID;
        result.token_usage = data.usage?.total_tokens || null;

        return result;
    } catch (err) {
        if (err.name === 'AbortError') {
            throw new Error('Request timeout after 15s');
        }
        throw err;
    } finally {
        clearTimeout(timeout);
    }
}

module.exports = { isLLMAvailable, analyzeMarket };
