/**
 * Global Liquidity Service
 *
 * Fetches macro liquidity metrics that historically correlate with BTC price:
 *   - Total crypto market cap trend (expanding = bullish)
 *   - BTC dominance (falling = risk-on / altseason, rising = flight-to-safety)
 *   - 24h trading volume change (rising = increased participation)
 *   - Market cap change % (momentum of liquidity flow)
 *
 * Source: CoinGecko free /global endpoint (no API key required)
 */

const { logError } = require('./logger');

const COINGECKO_GLOBAL_URL = 'https://api.coingecko.com/api/v3/global';
const CACHE_TTL = 300000; // 5 minutes - CoinGecko rate-limits free tier

let cache = null;
let cacheTimestamp = 0;

/**
 * Fetch global crypto market data from CoinGecko.
 * Returns a structured liquidity assessment or null on failure.
 */
async function fetchGlobalLiquidity() {
    // Return cached data if fresh
    if (cache && Date.now() - cacheTimestamp < CACHE_TTL) {
        return cache;
    }

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const res = await fetch(COINGECKO_GLOBAL_URL, {
            headers: { 'Accept': 'application/json' },
            signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!res.ok) {
            logError('GLOBAL_LIQUIDITY', `CoinGecko API ${res.status}`);
            return cache; // Return stale cache on error
        }

        const json = await res.json();
        const data = json.data;

        if (!data) {
            logError('GLOBAL_LIQUIDITY', 'No data in CoinGecko response');
            return cache;
        }

        const totalMarketCap = data.total_market_cap?.usd || 0;
        const totalVolume24h = data.total_volume?.usd || 0;
        const marketCapChange24h = data.market_cap_change_percentage_24h_usd || 0;
        const btcDominance = data.market_cap_percentage?.btc || 0;

        // Compute liquidity score (-100 to +100)
        // Positive = expanding liquidity (bullish for BTC)
        // Negative = contracting liquidity (bearish for BTC)
        const score = computeLiquidityScore({
            marketCapChange24h,
            btcDominance,
            totalMarketCap,
            totalVolume24h,
        });

        const trend = score > 15 ? 'expanding'
            : score < -15 ? 'contracting'
            : 'neutral';

        const result = {
            total_market_cap_usd: totalMarketCap,
            total_volume_24h_usd: totalVolume24h,
            market_cap_change_24h_pct: marketCapChange24h,
            btc_dominance: btcDominance,
            liquidity_score: score,
            liquidity_trend: trend,
            fetched_at: new Date().toISOString(),
        };

        cache = result;
        cacheTimestamp = Date.now();
        return result;
    } catch (err) {
        if (err.name === 'AbortError') {
            logError('GLOBAL_LIQUIDITY', 'CoinGecko request timeout');
        } else {
            logError('GLOBAL_LIQUIDITY', `Fetch error: ${err.message}`);
        }
        return cache; // Return stale cache
    }
}

/**
 * Compute a composite liquidity score from -100 to +100.
 *
 * Factors and weights:
 *   1. Market cap 24h change % — strongest signal of net liquidity flow (weight: 60%)
 *   2. BTC dominance level — extreme dominance (>60%) = risk-off; low (<40%) = risk-on (weight: 20%)
 *   3. Volume-to-market-cap ratio — high ratio = active liquidity (weight: 20%)
 */
function computeLiquidityScore({ marketCapChange24h, btcDominance, totalMarketCap, totalVolume24h }) {
    // Factor 1: Market cap momentum (-100 to +100)
    // Cap the effect at +-10% daily change
    const capMomentum = Math.max(-100, Math.min(100, marketCapChange24h * 10));

    // Factor 2: BTC dominance context (-100 to +100)
    // 50% dominance = neutral. Higher = contracting (capital fleeing to BTC safety), lower = expanding
    // This is a nuanced signal: very high BTC dominance during a rally can be bullish (BTC leading)
    // But in context of liquidity: lower dominance = more capital flowing into broader market
    const domScore = (50 - btcDominance) * 4; // +-40 range typical
    const domClamped = Math.max(-100, Math.min(100, domScore));

    // Factor 3: Volume/MCap ratio — higher means more active liquidity
    // Typical daily volume is 3-8% of total market cap
    const volRatio = totalMarketCap > 0 ? (totalVolume24h / totalMarketCap) * 100 : 5;
    // Normalize: 5% = neutral (0), >8% = bullish (+100), <2% = bearish (-100)
    const volScore = Math.max(-100, Math.min(100, (volRatio - 5) * 33));

    // Weighted composite
    const composite = capMomentum * 0.6 + domClamped * 0.2 + volScore * 0.2;

    return Math.round(Math.max(-100, Math.min(100, composite)));
}

module.exports = { fetchGlobalLiquidity };
