# Competitive positioning — trading-companion's Scanner vs. paid tools

Synthesized from three research passes this session (Trade Ideas, Benzinga
Pro, TC2000, Webull, Thinkorswim, TradingView, Finviz Elite's own UI).
Not a marketing doc — an honest feature-by-feature comparison to guide
what's worth building next and what's a real, informed gap to accept.

## What this app already matches or beats a paid tool on

| Feature | Paid comparable | This app |
|---|---|---|
| Momentum scanner (5 Pillars) | Warrior Trading's own paid course + Finviz Elite ($39.50/mo) | Same data source, free-tier logic layered on top |
| Setup Grade (A+–D mechanical score) | Trade Ideas' "Holly" AI ranking (bundled in $84–$228/mo plans) | Free, transparent formula, explicitly labeled "not advice" |
| Today's Top Picks digest | Trade Ideas' Holly daily picks | Free, same underlying data already being fetched |
| Heatmap view | TC2000's signature feature | Implemented for Top Gainers |
| Saved scan presets | TC2000 EasyScan, TradingView, Trade Ideas | Implemented, Supabase-synced across devices |
| CSV export | Benzinga Pro, TC2000, TradingView | Implemented on all 3 tabs |
| Keyboard shortcuts | TC2000, Thinkorswim | Implemented (tab switch, refresh, export, watchlist) |
| Audio + Discord/Slack + Telegram alerts | Trade Ideas (audio), TradingView (webhooks) | All three, plus a "test sound" preview button |
| Per-ticker notes | TC2000's watchlist context menu | Implemented (text-only — no charting surface to attach to) |
| 24/7 coverage (crypto + futures tabs) | Most paid scanners are single-market | 3 markets in one app, unified card UI |
| PWA installable (home-screen icon) | Webull/TC2000 mobile apps | Implemented this session (manifest + icon + no-op service worker) |

## Real, informed gaps — deliberately not built, and why

These aren't oversights — each was investigated and the decision to skip
is recorded so a future session doesn't re-litigate it without new
information:

- **Sector relative-strength ranking** (TC2000 staple) — blocked on an
  unverified Finviz export column ID for Sector. Two research passes
  could not find a documented ID; guessing one risks the exact class of
  silent bug that hit this session's price-filter feature (`sh_price_oN`
  looked valid, was actually a no-op). Only safe path: add a candidate ID
  to `DEFAULT_COLUMNS`, deploy, and inspect the live response header name
  before trusting it — not done yet because it needs a deliberate,
  supervised iteration, not an autonomous guess.
- **Finviz earnings/IPO-date column** — same block, same reasoning.
- **Multi-timeframe momentum (5-min/15-min bars) and true VWAP** — Finviz
  Elite, CoinGecko, and Yahoo Finance's free tiers only expose daily
  bars/current price, not intraday OHLC series. Would need a new paid
  data source (e.g., Polygon.io, Alpaca) to do properly.
  A same-session VWAP *approximation* from daily OHLC would be
  meaningfully weaker than TradingView's real rolling VWAP and risks
  looking authoritative when it isn't — not worth the trust cost.
- **Unusual options activity / dark-pool flow** (Benzinga Pro's paid
  add-on) — needs a dedicated paid feed (Benzinga, Cheddar Flow); no
  free-tier equivalent exists. Genuinely out of budget for a personal
  indie project, not a research gap.
- **Market internals (advance/decline, TICK, ADD)** — needs exchange-
  wide aggregate tick data none of the current sources expose; a
  TradingView community script exists but nothing free-tier and
  programmatic.
- **Mobile watchlist swipe gestures / per-ticker context menu beyond a
  star** (TC2000 mobile) — identified as feasible in the second research
  pass, not yet built; lower priority than the security/accessibility/
  correctness work this session prioritized instead.

## Where this app is architecturally different (not better or worse)

Every paid tool above is a subscription SaaS with its own data pipeline
and infrastructure team. This app runs on Vercel's free/hobby tier +
free-or-cheap public APIs (Finviz Elite is the one paid piece,
$39.50/mo), with Supabase's free tier for sync/alerts state. The
tradeoff is explicit throughout the code and docs: never guess an
undocumented API contract, verify everything empirically against a live
deploy before trusting it, and be honest in the UI copy about what's a
mechanical score versus real investment advice.
