# Trading Companion — Project Memory / Principles

## What this project is
A standalone (`index.html`, no build step) trading-companion web app plus a
reference library of trading-education PDFs, deployed to Vercel and backed
by Supabase for cross-device sync. Repo: github.com/toporek44/trading-companion.
Live: https://trading-companion-ashen.vercel.app

## Core goal (as stated by user)
Build a full plan to go from beginner → intermediate trader: learn how to
trade, find best strategies, find tooling to screen/select one trade at a
time, and grow a starting account — first on a simulated/paper account, then
live — via daily trading with low risk. Practicing on TradingView.

## Key assumption corrections — load-bearing, do not silently drop
- **"$1,000 → $50,000 in 1 year on low risk" is not achievable.** That's a
  ~50x return; genuine low-risk position sizing cannot produce it. 70–97% of
  day traders lose money across published studies; skilled retail traders
  typically land at 1–4%/month, not 20%+.
  **Decision made with user:** drop the $50k/1yr number. Optimize the plan
  for expectancy, discipline, and skill-building; treat capital growth as a
  byproduct, not the target. Always flag unrealistic return targets instead
  of building a plan around them.
- **Markets in scope:** crypto and options (user's explicit choice — not
  stocks/futures, despite most of the reference PDFs below being written for
  small-cap stock day trading). Translate stock-scanner concepts (relative
  volume, float, catalyst, price range) into crypto/options equivalents
  rather than assuming stocks.
- **Experience level:** complete beginner. Don't assume prior charting/
  platform knowledge.
- **Time budget:** 1–3 hours/day for learning + screening + trading. Size
  any daily routine/checklist to fit that window.
- **Practice venue:** TradingView for charting/paper trading.

## Reference library (`docs/reference/`)
All sourced from Warrior Trading (Ross Cameron) small-cap day-trading
material — the concrete numeric rules generalize well to crypto/options
risk sizing even though the instrument examples are stock-specific.

- **chart-patterns.pdf** — Bull Flag Breakout, Bear Flag Breakdown, Flat Top
  Breakout, Flat Bottom Breakdown, "Bull Flag Trap" false breakouts, double-
  top-at-whole-dollar rejection pattern. Visual pattern-recognition layer.
- **candlestick-pattern-reference.pdf** — single-page cheat sheet: Bullish
  (Hammer, Inverted Hammer, Dragonfly Doji, Bullish Engulfing, Tweezer
  Bottom, Morning Star, Three White Soldiers, Rising Three...), Bearish
  (mirror set), Neutral (Doji). Quick lookup during paper trading.
- **sac2024-strategy.pdf** — Small Account Challenge core strategy: 4-part
  filter (right stock, right entry, right share size, active risk mgmt);
  scanner criteria (price $1–$20, ≥5x relative volume, news catalyst, float
  <20M); "pullback pattern" entry; risk rules (risk $50 to make $100 week 1,
  -$100 daily max loss, stop after 3 consecutive losers); target 75% win
  rate with avg winner = 2x avg loser.
- **small-account-tool-kit-2025.pdf** — expanded version of the above (12
  pages): adds broker mechanics (US cash accounts settle T+1, no leverage
  under $5 stocks; international brokers up to 6x leverage but $200+/mo fees
  and no US deposit insurance) and a 12-broker comparison table.
- **warrior-trading-stock-selection.pdf** — 5-point scanner checklist (5x+
  relative volume, up 10%+ on the day, news catalyst, price $1–$20, float
  <10M); breakeven win-rate table (1:1 R:R needs 50% win rate, 2:1 needs
  33%); Bull Flag / Flat Top entry patterns.
- **sample-trading-plan.pdf** — fillable one-page Trading Plan Worksheet
  template + "Profit Trifecta Goals" progression table (Novice → Pro across
  consistency/accuracy/P&L-ratio) + pre-trading readiness checklist.
- **weekly-reporting-template.pdf** — per-trade journal columns (P/L, "5
  Pillars" met y/n, entry price, %-gain, rel. volume, float, news, timeframe,
  candlestick pattern, hold time) + weekly rollup (avg winner/loser, accuracy
  %, total P/L). Logging counterpart to the SAC scanner criteria.

**How to apply:** when building the app's Scanner, Journal, or Plan
Worksheet features, map these stock-specific numeric rules (relative
volume, float, R:R ratios, daily loss caps, consecutive-loss circuit
breakers) onto crypto/options equivalents rather than reinventing risk
rules from scratch.

## "Trading Foundations" plan — now merged into this repo
Full content merged from the Claude.ai Artifact into
`docs/trading-foundations-plan.md`. It supersedes/refines the earlier
crypto+options framing above in one respect: **the artifact's later version
pivoted futures (ES/NQ index futures) to the primary market**, with options
as secondary and crypto downgraded to optional/tertiary — driven by the
Section 10 VWAP/Market-Profile educator research. If asked to build
scanner/journal features, check which market focus is currently intended
(ask the user if unclear) rather than assuming the original crypto+options
framing still holds.

The interactive version (day-by-day calendar + milestone tracker with
localStorage progress) still lives at the original artifact URL:
https://claude.ai/code/artifact/2a9852fb-bf85-4b51-b8a6-e4ac898376a9 — the
markdown copy in this repo has the same content but no interactivity.

## Working notes on tooling
- Vercel: authenticate via local CLI (`vercel login` — device-code flow,
  runs long, use background bash), not the claude.ai Vercel MCP connector —
  that connector hit a 403 scope error against this Vercel team
  (`maciejs-projects-37634ad3`) when trying to link/create the git project.
- `vercel git connect` intermittently 500s even with correct GitHub App
  permissions; confirm the link actually works by pushing a commit and
  checking for a `-git-main-` deployment alias rather than trusting the
  connect command's exit code alone.
