# CryptoEdge AI - Project Context

## Architecture
- **Backend:** Node.js (Express) with SQLite (better-sqlite3)
- **Frontend:** Single-page HTML dashboard (`public/dashboard.html`)
- **Signal Engine:** LLM-powered (Kimi K2.5 via Moonshot API) with technical indicators
- **Exchange:** Kraken (public API for data, private API for live trading)
- **Deployment:** Render (see `render.yaml`)

## Key Files
- `server/services/llmAnalysis.js` — LLM system/user prompt, JSON response parsing
- `server/services/signals.js` — Signal generation pipeline, DB storage, WebSocket broadcast
- `server/services/indicators.js` — All technical indicator calculations (RSI, MACD, BB, ADX, etc.)
- `server/services/globalLiquidity.js` — Global Liquidity macro data from CoinGecko
- `server/services/agentLearning.js` — Self-learning from closed trade outcomes
- `server/services/kraken.js` — Kraken API wrapper (public + private endpoints)
- `server/db/init.js` — SQLite schema + migrations
- `public/dashboard.html` — Full dashboard UI with charts, signals, trading

## Signal Generation Flow
1. Fetch OHLCV candles + ticker + order book from Kraken (parallel)
2. Fetch Global Liquidity data from CoinGecko (parallel)
3. Compute 15+ technical indicators (RSI, MACD, BB, EMA, ADX, Stochastic, ATR, OBV, MFI, VWAP, S/R)
4. Load agent learning context (past trade performance)
5. Send all data to Kimi K2.5 LLM with structured prompt
6. Parse JSON response → store in SQLite → broadcast via WebSocket

## Change Log

### 2026-02-15: Balanced LONG/SHORT Signals + Global Liquidity
**Problem:** Algorithm only produced SHORT signals due to prompt saying "only trade in trend direction" — bearish EMAs meant perpetual SHORT bias.

**Solution (5 files changed, 1 new):**

1. **NEW `server/services/globalLiquidity.js`**
   - Fetches crypto macro liquidity data from CoinGecko free `/global` API
   - Computes composite liquidity score (-100 to +100) from: market cap momentum (60%), BTC dominance (20%), volume/mcap ratio (20%)
   - 5-min cache, graceful fallback to stale data on API errors

2. **`server/services/llmAnalysis.js` — Core prompt rewrite**
   - Added CRITICAL instruction: "evaluate BOTH long and short setups, do not default to trend direction"
   - Global Liquidity is now factor #1 (highest priority) in analysis framework
   - Rules: expanding liquidity + bearish technicals = look for LONG reversal; contracting + bullish = look for SHORT
   - RSI < 35 + expanding liquidity = strong LONG; RSI > 65 + contracting = strong SHORT
   - Liquidity alignment boosts confidence ~10pts, disagreement reduces ~10pts
   - New JSON output field: `global_liquidity_assessment`
   - Global Liquidity data sent as FIRST section in user prompt (before technicals)

3. **`server/services/signals.js`** — Fetches global liquidity in parallel, passes to LLM, stores + returns assessment

4. **`server/db/init.js`** — Migration for `global_liquidity_assessment TEXT` column

5. **`public/dashboard.html`** — Blue-accented "Global Liquidity" section in signal cards showing the LLM's macro assessment

**Expected outcome:** Mix of LONG and SHORT signals; Global Liquidity visible in every signal analysis text.
