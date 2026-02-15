# CryptoEdge AI - Project Context

## Architecture
- **Backend:** Node.js (Express) with SQLite (better-sqlite3)
- **Frontend:** Single-page HTML dashboard (`public/dashboard.html`)
- **Signal Engine:** LLM-powered (Kimi K2.5 via Moonshot API) with technical indicators
- **Exchange:** Kraken (public API for data, private API for live trading)
- **Deployment:** Render (see `render.yaml`)

## Key Files
- `server/services/llmAnalysis.js` — LLM system/user prompt, JSON response parsing, direction override logic
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
6. LLM scores both LONG case (0-100) and SHORT case (0-100)
7. Parse JSON response → structural override if scores contradict direction → store in SQLite → broadcast via WebSocket

## Current Algorithm State (as of 2026-02-15)

### How Signals Are Decided
The LLM receives all market data and follows a **mandatory 3-step process**:

**Step 1 — Score the LONG case (0-100):** Count bullish factors from a checklist:
- Price near support / lower BB, RSI < 50 (especially < 35), MACD turning positive, Stochastic %K < 30 or crossing up, expanding global liquidity, price at/above VWAP, bid-heavy order book, OBV rising, MFI > 50, +DI > -DI

**Step 2 — Score the SHORT case (0-100):** Count bearish factors:
- Price near resistance / upper BB, RSI > 50 (especially > 65), MACD turning negative, Stochastic %K > 70 or crossing down, contracting global liquidity, price below VWAP, ask-heavy order book, OBV falling, MFI < 50, -DI > +DI

**Step 3 — Pick the higher score.** If within 5 points, Global Liquidity is the tiebreaker (positive = long, negative = short). Both below 30 = hold.

### Structural Safeguard (in `parseResponse()`)
If the LLM outputs scores that contradict its chosen direction (e.g. `long_score: 65, short_score: 40` but says `"direction": "short"`), the code **overrides** the direction to match the higher score. This prevents the LLM from being lazy or biased. This is NOT hardcoded — the scores are dynamically calculated from live data every cycle.

### Global Liquidity
- **Source:** CoinGecko free `/global` API (no key needed)
- **Score formula (-100 to +100):**
  - Total crypto market cap 24h change — 60% weight (strongest signal of net capital flow)
  - BTC dominance level — 20% weight (50% = neutral; higher = risk-off/contracting; lower = risk-on)
  - Volume-to-market-cap ratio — 20% weight (5% = neutral; higher = active liquidity)
- **Trend labels:** score > 15 = "expanding", < -15 = "contracting", else "neutral"
- **Cache:** 5-minute TTL, falls back to stale data on API errors
- **Impact on signals:** Liquidity trend is presented as the FIRST data section to the LLM (before technicals). The prompt instructs: expanding liquidity + bearish technicals = look for LONG reversal; contracting + bullish technicals = look for SHORT reversal.

### Dashboard Display
Each signal card shows:
- Direction badge (LONG/SHORT/HOLD) with confidence %
- Sentiment + Risk + AI badge
- **L: and S: score badges** — the raw long/short scores so the reasoning is visible
- Analysis text (2-4 sentences referencing both cases)
- **Global Liquidity section** (blue accent) — 1-2 sentences on macro conditions
- Key factor tags
- Entry / Stop Loss / Take Profit levels

## Lessons Learned / Debugging Notes

### Kimi K2.5 Behavioral Quirks
- **Requires `temperature: 1`** — lower values cause API errors (commit `458dfe5`)
- **Has a strong SHORT/bearish bias** — when told "evaluate both directions" in plain text, it ignores the instruction and defaults to whichever direction the EMAs suggest. The only reliable fix was forcing it to output numerical scores for both sides in the JSON schema, plus a code-level override.
- **Thinking mode needs time** — LLM_TIMEOUT is set to 90s on Render because K2.5's thinking mode can be slow

### Why the Algorithm Was Stuck on SHORT (Root Cause Analysis)
1. **Original prompt said "Only trade in trend direction"** — if EMAs were bearish (EMA20 < EMA50 < EMA200), the LLM always output SHORT regardless of other factors
2. **No macro context** — the algorithm had zero awareness of capital flows, market cap trends, or liquidity conditions that could override short-term technical bearishness
3. **First fix attempt (soft prompt change) failed** — adding "CRITICAL: evaluate both" instruction was ignored by Kimi K2.5. The model is not strong enough to override its own analytical bias from a text instruction alone
4. **Working fix: forced scoring + structural override** — requiring `long_score` and `short_score` as mandatory JSON fields forces the model to actually enumerate factors for both sides. The `parseResponse()` override catches any remaining contradictions. This is a proven LLM debiasing technique.

### Key Insight for Future Development
When working with weaker LLMs (Kimi K2.5), **don't rely on text instructions to change behavior**. Instead, change the **output schema** to force the desired reasoning process, and add **code-level validation** to enforce consistency. The JSON schema IS the control mechanism.

## Change Log

### 2026-02-15 (v2): Forced Dual-Direction Scoring
**Problem:** First prompt fix ("evaluate both") was ignored by Kimi K2.5 — still only SHORT.

**Fix:** Restructured the entire prompt around a mandatory 3-step scoring process:
- LLM must output `long_score` (0-100) and `short_score` (0-100) with specific checklists
- `parseResponse()` now overrides direction if scores contradict the LLM's choice
- Dashboard shows L: and S: score badges for transparency
- Confidence capped at 85 (was 95) to reflect realistic accuracy

### 2026-02-15 (v1): Global Liquidity + Balanced Signals
**Problem:** Algorithm only produced SHORT signals — prompt said "only trade in trend direction."

**Solution:**
- NEW `server/services/globalLiquidity.js` — CoinGecko macro data, composite score (-100 to +100)
- Rewrote LLM system prompt with Global Liquidity as #1 priority factor
- Global Liquidity data sent as first section in user prompt
- New `global_liquidity_assessment` field in DB + dashboard display
- DB migration for new column
