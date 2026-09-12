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

## Scanner (current state — three market tabs, all card-grid UI)

The Scanner tab has grown well beyond the original US-stocks-only design.
It now covers three markets via a segmented tab control (`#sc-market-tabs`,
values `stocks`/`crypto`/`futures`), each rendering the same shared
`.sc-stock-card`/`.sc-card-grid` card UI (`js/scanner.js` exports the
reusable pieces — `scannerFreshnessBucket`, `escapeHtml`,
`scannerNewsPanelHtml`, `csvEscape`, `downloadCsv`).

- **US Stocks** (`js/scanner.js`) — Finviz Elite live data
  (`api/scanner-gainers.js`), Finnhub news (`api/scanner-news.js`), the
  5-Pillars scoring system, a **Setup Grade** (A+/A/B/C/D — a mechanical
  score from pillar count + rel-vol + news freshness, explicitly labeled
  "not investment advice"), a **Today's Top Picks** 3-ticker daily shortlist
  (ranked by Setup Grade, independent of the user's filters), a **Cards /
  Heatmap** view toggle on Top Gainers, **saved filter presets**
  (Supabase-synced, same pattern as the price-range setting), **per-ticker
  notes** (localStorage only, not synced — matches the watchlist's own
  persistence tier), CSV export, and keyboard shortcuts
  (`js/scanner-shortcuts.js`: 1/2/3 switch tabs, r refresh, e export CSV, w
  watchlist filter, ? help).
- **Crypto** (`js/crypto-scanner.js`) — CoinGecko free public API
  (`api/scanner-crypto.js`, no key), 24/7 coverage for when the US market
  is closed. News via Cointelegraph's per-tag RSS feed
  (`api/scanner-crypto-news.js`) — CryptoCompare/CryptoPanic/CoinGecko's own
  news endpoints all now require a paid key (verified live, all 401/403'd).
  No Pillars/Setup-Grade scoring (float/short-interest/catalyst mechanics
  don't apply to crypto) — instead a transparent "momentum" tag from
  volume/market-cap turnover.
- **Futures** (`js/futures-scanner.js`) — a fixed watchlist of 14 major
  CME/CBOT/NYMEX/COMEX contracts via Yahoo Finance's free v8 chart endpoint
  (`api/scanner-futures.js` — Yahoo's newer v7/quote endpoint now requires
  an auth crumb and 401s; the older per-symbol v8/chart endpoint still works
  unauthenticated). No screener concept (too few liquid contracts to screen)
  — ranked by \|% change\| instead. Shared "macro headlines" feed (Finnhub
  general news) in every card's detail, since futures move on Fed/CPI/jobs
  news shared across contracts rather than per-contract filings.

**Telegram + Discord/Slack alerts** (`api/check-alerts.js`) — runs
automatically every 2 minutes via **Supabase `pg_cron`+`pg_net`** (not an
external scheduler; `pg_net`'s default 5000ms timeout was too short for
this endpoint's sequential Finviz+Finnhub calls, bumped to 25000ms), fires
a Telegram message on a new 5/5-Pillars stock or fresh (<2h) news, and
optionally also posts to a Discord/Slack webhook (`DISCORD_WEBHOOK_URL` env
var, entirely additive — Telegram remains the only required channel).
Dedup state lives in the same Supabase `progress` table as everything else
(key `telegram-alerts-fired`).

**Shared server-side code**: `api/_lib/supabase.js` (SUPABASE_URL/
SUPABASE_ANON_KEY/getPriceRange, used by `scanner-gainers.js` and
`check-alerts.js`) and `api/_lib/finviz.js` (the Finviz CSV parser —
`parseCsv`/`findCol`/`toNumber`/`shapeRow`/`fetchFinvizRows`, also shared
by those same two files). Files under `api/_lib/` are never routed by
Vercel (underscore-prefixed folders are excluded), so these add no new
endpoints — just eliminate what used to be two verbatim-duplicated copies.

**Known-safe empirical-testing pattern for this codebase**: Finviz/Yahoo
column IDs and filter syntax are undocumented and easy to get silently
wrong (a real bug this session: `sh_price_oN`/`sh_price_uN` looked valid
but were silently no-ops — the correct syntax is `sh_price_NtoM`). Never
guess a new column ID or filter token from third-party docs alone — add it
to a live deploy and curl the production endpoint to confirm the actual
returned data before trusting it. This already blocked adding a
sector-relative-strength feature and a Finviz earnings/IPO-date column
this session (both would have needed an unverified guess).

## Local dev with Vite (dev-tooling only, does not affect deploy)
Vite was added purely to make local iteration nicer than
`python3 -m http.server` (no HMR) or `vercel dev` alone (slower to start).
**This does not change how the app is built or deployed** — Vercel still
deploys the literal `index.html` / `styles.css` / `js/*.js` / `api/*.js`
files unchanged, with zero build step. There is no `dist/` output, no
Vercel build command, and `vite`/`vite.config.js`/`package.json` are dev-only
files that Vercel's static/serverless deploy never touches.

- **Install once:** `npm install` (installs `vite` as the only
  devDependency — the app itself still has zero npm runtime deps; Supabase
  stays a CDN `<script>` tag in `index.html`).
- **UI/CSS/markup-only iteration:** `npm run dev` alone. Vite serves
  `index.html` at the root with fast reload and native ES module support.
  Scanner API calls (`/api/scanner-gainers`, `/api/scanner-news`) will fail
  in this mode (no serverless functions behind plain Vite) — expected and
  fine when you're not touching Scanner data.
- **Full local testing (anything touching Scanner's live data):** run both,
  in two terminals:
  1. `vercel dev` (serves `api/*.js` on `http://localhost:3000`, picks up
     `.env` at the repo root the same way it always has)
  2. `npm run dev` (Vite on its default port, e.g. 5173)
  Vite's `vite.config.js` proxies `/api/*` requests to
  `http://localhost:3000`, so the app's own `fetch('/api/scanner-gainers')`
  calls reach the real `vercel dev` serverless functions. Browse the app via
  the Vite URL, not the `vercel dev` one.
- No application source files (`index.html`, `js/*.js`, `styles.css`,
  `api/*.js`) needed to change to make this work.
- **Why `vercel.json` exists:** adding `vite`/`vite.config.js` as
  devDependencies made both `vercel dev` and (would-be) Vercel project
  creation auto-detect this as a "Vite" framework project and want to run
  `vite build` → `dist/`, which would silently turn on a build step this
  project must never have. `vercel.json` pins `"framework": null` (the
  "Other" preset) to force plain static + serverless-functions behavior
  regardless of `vite`'s presence — confirmed by testing: without this file,
  `vercel dev` reported "Detected Vite (Build Command: vite build, Output
  Directory: dist)"; with it, `vercel dev` served `index.html` and
  `api/*.js` directly, unchanged, exactly like today's production deploy.

## Working notes on tooling
- Vercel: authenticate via local CLI (`vercel login` — device-code flow,
  runs long, use background bash), not the claude.ai Vercel MCP connector —
  that connector hit a 403 scope error against this Vercel team
  (`maciejs-projects-37634ad3`) when trying to link/create the git project.
- `vercel git connect` intermittently 500s even with correct GitHub App
  permissions; confirm the link actually works by pushing a commit and
  checking for a `-git-main-` deployment alias rather than trusting the
  connect command's exit code alone.
