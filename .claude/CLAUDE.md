# CryptoEdge AI - Project Context

## Architecture
- **Backend:** Node.js (Express) with SQLite (better-sqlite3)
- **Frontend:** Single-page HTML dashboard (`public/dashboard.html`)
- **Signal Engine:** LLM-powered (MiniMax M2.5 via OpenRouter) with technical indicators
- **Exchange:** Kraken (public API for data, private API for live trading)
- **Deployment:** Render (see `render.yaml`)
- **Render Dashboard:** https://dashboard.render.com/web/srv-d64vb3e3jp1c73c4c7jg/env
- **Render Service ID:** `srv-d64vb3e3jp1c73c4c7jg`

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
5. Send all data to MiniMax M2.5 LLM with structured prompt
6. LLM scores LONG case (0-100) and BEARISH RISK (0-100)
7. Parse JSON response → enforce long-only logic (long_score >= 45 && > bearish_risk + 5 = LONG, else HOLD) → store in SQLite → broadcast via WebSocket

## Current Algorithm State (as of 2026-02-16)

### Long-Only Mode
The system only outputs **LONG** (enter trade) or **HOLD** (wait). SHORT signals are never produced — the user can only go long on crypto, so bearish analysis is used to decide when to *wait* rather than generating unusable short signals.

### How Signals Are Decided
The LLM receives all market data and follows a **mandatory 3-step process**:

**Step 1 — Score the LONG case (0-100):** Count bullish factors from a checklist:
- Price near support / lower BB, RSI < 50 (especially < 35), MACD turning positive, Stochastic %K < 30 or crossing up, expanding global liquidity, price at/above VWAP, bid-heavy order book, OBV rising, MFI > 50, +DI > -DI

**Step 2 — Score the BEARISH RISK (0-100):** How dangerous is it to go long right now?
- Price near resistance / upper BB, RSI > 50 (especially > 65), MACD turning negative, Stochastic %K > 70 or crossing down, contracting global liquidity, price below VWAP, ask-heavy order book, OBV falling, MFI < 50, -DI > +DI

**Step 3 — Decide LONG or HOLD:**
- `long_score >= 45 AND long_score > bearish_risk_score + 5` → **LONG**
- Everything else → **HOLD** (wait for a better entry)

### Structural Safeguard (in `parseResponse()`)
- If LLM outputs `"short"` → automatically mapped to `"hold"`
- Scores enforce direction: `long_score >= 45 && long_score > bearishRisk + 5` = long, else hold
- HOLD signals have entry/stop-loss/take-profit set to null (no trade levels needed)

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
- Direction badge (LONG/HOLD) with confidence %
- Sentiment + Risk + AI badge
- **L: and Risk: score badges** — the raw long score and bearish risk score so the reasoning is visible
- Analysis text (2-4 sentences explaining long viability or why to wait)
- **Global Liquidity section** (blue accent) — 1-2 sentences on macro conditions
- Key factor tags
- Entry / Stop Loss / Take Profit levels (only for LONG signals)

## Lessons Learned / Debugging Notes

### LLM Model History
- **Kimi K2.5 (retired):** Required `temperature: 1` (lower caused API errors). Had strong SHORT/bearish bias — ignored text instructions to evaluate both directions. Required forced numerical scoring + code-level override to produce balanced signals. Thinking mode needed 90s timeout.
- **MiniMax M2.5 via OpenRouter (current):** Stronger instruction-following, OpenAI-compatible API. Temperature set to 0.7. Served by SiliconFlow through OpenRouter ($0.20/M input, $1.00/M output). M2.5 not yet on MiniMax direct pay-as-you-go. Expected to follow the dual-scoring prompt more reliably.

### Why the Algorithm Was Stuck on SHORT (Root Cause Analysis)
1. **Original prompt said "Only trade in trend direction"** — if EMAs were bearish (EMA20 < EMA50 < EMA200), the LLM always output SHORT regardless of other factors
2. **No macro context** — the algorithm had zero awareness of capital flows, market cap trends, or liquidity conditions that could override short-term technical bearishness
3. **First fix attempt (soft prompt change) failed** — adding "CRITICAL: evaluate both" instruction was ignored by Kimi K2.5. The model is not strong enough to override its own analytical bias from a text instruction alone
4. **Working fix: forced scoring + structural override** — requiring `long_score` and `short_score` as mandatory JSON fields forces the model to actually enumerate factors for both sides. The `parseResponse()` override catches any remaining contradictions. This is a proven LLM debiasing technique.
5. **Model upgrade to MiniMax M2.5** — stronger instruction-following should produce more balanced signals without needing the structural override as a crutch (override kept as safety net)

### Key Insight for Future Development
When working with weaker LLMs, **don't rely on text instructions to change behavior**. Instead, change the **output schema** to force the desired reasoning process, and add **code-level validation** to enforce consistency. The JSON schema IS the control mechanism. Upgrading the model is the cleanest long-term fix.

## Change Log

### 2026-02-16 (v4): Long-Only Mode — Remove SHORT Signals
**Problem:** User can only go long (buy crypto). ~89% of signals were SHORT, which is noise — user can't act on them.

**Fix:** Converted to long-only signal system:
- LLM prompt STEP 2 renamed from "Score the SHORT case" to "Score the BEARISH RISK"
- STEP 3 rewritten: `long_score >= 45 AND > bearish_risk + 5` → LONG, else → HOLD
- `short_score` renamed to `bearish_risk_score` throughout (backwards-compatible parsing)
- `parseResponse()` maps any LLM "short" output to "hold"
- HOLD signals have entry/stop-loss/take-profit set to null
- Dashboard: Short trade button removed, `S:` badge renamed to `Risk:`
- Marketing: "Long & Short Signals" → "Long & Hold Signals"
- No DB migration needed — old 'short' data preserved, CHECK constraint still valid

### 2026-02-16 (v3): Switch from Kimi K2.5 to MiniMax M2.5
**Problem:** Kimi K2.5 still produced 89% SHORT signals despite forced dual-scoring — weak instruction-following.

**Fix:** Switched LLM to MiniMax M2.5:
- Stronger instruction-following, expected to produce more balanced long/short signals
- ~50-60% cheaper ($0.30/M input, $1.20/M output vs $0.60/$3.00)
- Routed through OpenRouter (SiliconFlow provider) — $0.20/M input, $1.00/M output
- M2.5 not yet on MiniMax direct pay-as-you-go, OpenRouter is the only option
- Temperature changed from 1.0 (Kimi requirement) to 0.7
- Env vars generalized: `KIMI_API_KEY` → `LLM_API_KEY` (backwards-compatible, old vars still work)
- Model ID: `minimax/minimax-m2.5` (OpenRouter format)
- Structural override kept as safety net

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
