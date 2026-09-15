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
(key `telegram-alerts-fired`). **Real bug fixed** (found via a direct code
review of `api/*.js`, not an audit fork): if `sendAlert()` threw partway
through a multi-alert batch (a single Telegram rate-limit/network blip),
`saveFiredState()` was skipped entirely on the way to the outer catch —
losing the dedup mark even for alerts that had already sent successfully,
causing them to fire again (duplicate Telegram/Discord messages) on the
next 2-minute cron tick. Now the send loop always persists fired state for
whatever was attempted that run before re-throwing the error.

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

### Scanner additions from an extended `/loop` pass on this same session

A long autonomous `/loop` run (research competitors, add features, fix
bugs, verify every change live) added, on top of everything above:

- **Setup Grade** (A+–D, `js/scanner.js` `scannerSetupScore`) — a
  mechanical score from pillar count + rel-vol + news freshness,
  explicitly labeled "not a buy/sell recommendation" in the UI.
- **Today's Top Picks** — a 3-ticker daily shortlist ranked by Setup
  Grade, independent of the user's Filters/Watchlist-only toggle.
- **Heatmap view** (Cards/Heatmap toggle on Top Gainers).
- **Saved filter presets** and **per-ticker notes** (notes are
  localStorage-only, matching the watchlist's own persistence tier).
- **CSV export** on all 3 tabs (`downloadCsv()` shared helper) and
  **keyboard shortcuts** (`js/scanner-shortcuts.js`).
- **Direct chart/data-source links** in every card's detail panel
  (Finviz+TradingView for stocks, CoinGecko+TradingView for crypto,
  Yahoo Finance for futures — deliberately no TradingView link for
  futures, since continuous-contract symbol mapping isn't reliably
  guessable, same caution as the sector/earnings-date columns above).
- **Discord/Slack webhook** alerts alongside Telegram (`DISCORD_WEBHOOK_URL`,
  optional, additive — see `docs/telegram-alerts-plan.md`).
- **PWA installability** — `manifest.json`, `icon.svg` (the sidebar's ◆
  mark), a deliberately no-op `sw.js` (registering a service worker is
  what most browsers require for installability, but this app's whole
  value is live data, so it must never risk caching an `/api/*` response).
- **Security fix**: a real stored XSS existed in `js/journal.js`/
  `journal-stats.js` — free-text Instrument/Strategy/Tags fields were
  interpolated unescaped into innerHTML. Fixed; `escapeHtml` now lives in
  `js/state.js` (shared by both scanner and journal modules without a
  circular import). A follow-up sweep of the rest of the app found no
  other instances.
- **Accessibility fixes**: the card-expand interaction
  (`.sc-card-clickzone`) was a plain non-interactive `<div>` — completely
  unreachable by keyboard/screen reader on all 3 tabs. Now `role="button"`
  + `tabindex="0"` + Enter/Space handling + `aria-label`. Sort pill
  buttons gained `aria-pressed`/dynamic `aria-label` (the ▲/▼ glyph alone
  isn't announced). Light-theme `--good`/`--bad`/`--accent` were
  WCAG-AA-failing (3.98-4.06:1 against their own `-soft` pill
  backgrounds, computed not eyeballed) — darkened ~10% to pass 4.5:1;
  dark theme was already fine.
- **Performance**: `startVisibilityAwareRefresh()` (shared, `js/scanner.js`)
  pauses each tab's 60s auto-refresh while the browser tab is hidden and
  catches up immediately on becoming visible again — was previously a
  plain `setInterval` burning Finviz/CoinGecko/Yahoo quota in the
  background for nobody.
- **Other real bugs fixed**: a null-vol/pct crash risk (Finviz's `"-"` for
  halted tickers), an unescaped ticker in an inline `onclick`, an
  overlapping-refresh race from a missing in-flight guard (and a second,
  subtler version of the same race one level deeper in the news-check
  sub-sequence), `cleanNum`'s `parseFloat(...) || null` silently turning a
  real `$0` breakeven trade into `null`, and the Journal's price pillar
  drifting to a hardcoded `$1-$20` after the Scanner's own range became
  user-editable (`getScannerPriceRange()` in `state.js` now shared).
- See `docs/competitive-positioning.md` for the full feature-by-feature
  comparison against Trade Ideas/Benzinga Pro/TC2000/TradingView/Webull,
  including the informed, reasoned list of what was deliberately *not*
  built and why.
- **Unfiltered Top 10 gainers card** (`scan-gainers-unfiltered`,
  `scannerUnfilteredGainers`/`renderScannerUnfilteredGainers` in
  `js/scanner.js`): user reported only ~4 cards showing in "Top gainers" —
  not a bug, the filtered list (`scannerVisibleRows`) was correctly
  narrowing Finviz's 30-row fetch down to matches under the user's own
  price/%/vol filters. Added a separate always-10, filter-independent card
  above it (same framing as Today's Top Picks — "regardless of your
  filters") sourced straight from `cache.top_gainers` with no
  `scannerFilterRow`/watchlist-only applied, for "what's actually moving
  the most today" market-wide context distinct from "what matches my
  setup criteria."
- **Per-ticker price target alerts** (`js/scanner.js`:
  `getScannerPriceAlerts`/`setScannerPriceAlert`/`checkScannerPriceAlerts`,
  Stocks tab only): thinkorswim/TC2000/Webull all have this as a core
  feature; this app only had condition-based alerts (5/5 Pillars, fresh
  news) before. Set an above/below target price per ticker from the
  card's detail panel — reuses the existing browser-notification/chime
  infra (`fireScannerAlert`), localStorage-only like the watchlist/notes
  (same tier, no server cron support since `check-alerts.js` only scans
  the Finviz gainers/most-active universe). Unlike the daily-reset
  Pillars/news alerts, a price target is one-shot: fires once, then is
  auto-removed, so the same crossing doesn't re-notify every 60s refresh.
  A collapsed card shows a 🔔 badge (same pattern as the 📝 notes icon)
  when an alert is armed. Caught and fixed a real bug before shipping:
  the first draft removed the alert from storage unconditionally before
  checking whether notifications were actually enabled/granted, which
  would have silently discarded a one-shot target with no notification
  ever shown if the user hadn't clicked "Enable alerts" — now gated by
  `scannerAlertsActive()` before the alert is ever consumed. Verified
  live via `vercel dev` + Playwright: set/update/clear all persist and
  re-render correctly, bell badge appears/disappears, zero console
  errors from the new code path.
- **Price alerts extended to Crypto and Futures** (same `/loop` pass):
  same class of gap as sort/filter/heatmap/watchlist parity earlier this
  session — a feature shipped Stocks-only, then closed out across all 3
  markets. Generalized `checkScannerPriceAlerts` (js/scanner.js) to take
  `keyFn`/`priceFn` params instead of hardcoding `row.ticker`/`row.price`,
  so Crypto/Futures can reuse the exact same one-shot check loop against
  their own row shapes (`coin.symbol`, `c.symbol`) and prefixed alert
  keys (`crypto:SYMBOL`, `futures:SYMBOL` — same collision-avoidance
  pattern as notes/watchlist). Alert-hit messages use 4-sig-fig precision
  for sub-$1 prices (crypto) instead of a flat 2dp that would round a
  small-cap altcoin's target to $0.00. Verified live on all 3 markets via
  `vercel dev` + Playwright: set/persist/clear each round-tripped through
  localStorage correctly, zero console errors.
- **Price-alert code de-duplicated** (same `/loop` pass, immediate
  follow-up): the mini-form markup, 🔔 bell badge, and Set/Clear click
  handler had been copy-pasted near-verbatim into all 3 scanner files.
  Extracted into 3 shared exports from `js/scanner.js` —
  `scannerPriceAlertFormHtml(alertKey, placeholderPrice, priceAlert)`,
  `scannerPriceAlertBellHtml(priceAlert)`, and
  `handleScannerPriceAlertClick(e, statusFn, rerenderFn)` (returns
  true/false so each market's click listener can `if(handled) return;`
  before its own zone/watch-toggle logic) — cut ~70 duplicated lines
  down to one shared implementation each market calls with its own
  prefixed key, status function, and re-render function. Re-verified all
  3 markets end-to-end after the refactor (same live `vercel dev` +
  Playwright pass as above) before shipping — a refactor of already-
  shipped, working code gets the same live-verification bar as a new
  feature, not less.
- **Cross-market price-alert manager** (same `/loop` pass): the only way
  to see what alerts were armed was opening every card on every tab
  looking for a 🔔 badge — thinkorswim/TC2000 both have a dedicated alert
  manager list. Added one card above the market tabs (`#sc-price-alerts-
  manager-card`, `renderScannerPriceAlertsManager` in js/scanner.js) —
  deliberately market-independent, not scoped inside any one
  `sc-market-*` panel, since alerts span all 3 markets. Each row shows
  which market it's from, the symbol, direction/target, a "Jump" button
  (switches `#sc-market-tabs` to that market) and "Remove". Auto-hides
  when no alerts are armed. The interesting bug this surfaced: removing
  an alert for a currently-hidden market (e.g. clearing a crypto alert
  while on the Stocks tab) left that market's own 🔔 badge stale in the
  DOM until its next 60s auto-refresh, since scanner.js can't import
  crypto-scanner.js/futures-scanner.js's render functions without a
  circular import (they already import from this file). Fixed with a
  `sc-price-alerts-changed` DOM CustomEvent dispatched on every mutation
  (set/remove/one-shot-fire) that each market's own file listens for and
  re-renders on, verified live: removing an alert from the manager while
  a different tab is open updates that other tab's badge immediately,
  not just on the next scheduled refresh.
- **Sorting/filtering has parity across all 3 tabs.** Stocks had it first;
  Crypto (sort pills + a Filters card) and Futures (sort pills + a
  categorical Group filter — Index/Energy/Metals/Rates/Currency/Crypto,
  since 14 fixed contracts spanning wildly different price scales don't
  suit a numeric min/max filter) were a real gap a user flagged and got
  matching treatment. Each tab's sort bar is scoped to its own `data-scope`
  values and CSS class (`.sc-sort-bar`, not the stock-only `.sc-sort-row`)
  — a real bug was caught mid-build where sharing the class would have let
  `scanner.js`'s generic handler crash on `scannerSortState['crypto-...']`
  being undefined.

- **Sector performance unblocked and shipped** (a still-later `/loop`
  pass, same session; two audit forks this cycle — practice.js/srs.js
  came back clean, no bugs found): the "real, informed gaps" list above
  named Sector relative-strength as blocked on an unverified Finviz
  column ID, deliberately left unguessed pending a supervised, verified
  iteration. Ran exactly that iteration: curled the real production
  Finviz Elite export with candidate columns 3/4 and confirmed live —
  they're genuinely "Sector"/"Industry", not a guess. Added both to
  `DEFAULT_COLUMNS` (`api/_lib/finviz.js`) and `shapeRow`'s output,
  parsed by header name (not position) like every other column here, so
  existing callers (`scanner-gainers.js`, `check-alerts.js`) pick them up
  with zero changes needed elsewhere. Also discovered and verified a
  second, genuinely different Finviz Elite endpoint while investigating
  — `grp_export.ashx?g=sector` (Finviz Elite's own "Groups" tab, a
  feature this app's own competitive doc named as something a free
  scanner couldn't show) returns full per-sector aggregate performance
  (today/week/month/rel-vol) in one call, one row per sector rather than
  per stock. New `api/scanner-sectors.js` proxies it; new
  `#sc-sectors-card` (`js/scanner.js`) shows all 11 sectors' today %
  change as sorted color pills, refreshed every 5min (sector aggregates
  move slowly — no need for the gainers loop's 60s cadence, spares
  Finviz Elite's per-request quota). Each stock card's detail panel also
  gained a "Sector: X · Industry: Y — sector is up/down N% today, this
  stock is outperforming/underperforming it" line
  (`scannerSectorPerf`) — the actual relative-strength cue the gap was
  originally about, now grounded in real per-sector data instead of only
  comparing against the ~30 other tickers already in the gainers fetch.
  Verified live via `vercel dev` + Playwright + direct curl of both new
  endpoints: real Sector/Industry values came back on gainer rows, the
  sectors card rendered all 11 sectors sorted correctly, and a card's
  detail panel correctly computed "outperforming" for a +100% mover
  against a -1.42% sector.

- **Multi-timeframe momentum unblocked too — a documented "impossible"
  gap turned out wrong** (a still-later `/loop` pass, same session):
  while re-verifying the Sector/Industry columns above, dumped a full
  1-100 column range from a real Finviz Elite export to look for
  Earnings Date/IPO Date (the other explicitly-blocked gap) and found
  columns 90-99 are `Performance (1/2/3/5/10/15/30 Minutes)` and
  `(1/2/4 Hours)` — genuine intraday momentum percentages computed
  server-side by Finviz Elite. This directly contradicts what
  competitive-positioning.md had recorded as the reason this gap was
  blocked ("Finviz Elite... free tiers only expose daily bars, not
  intraday" — wrong; no raw OHLC needed, Finviz already computes the
  momentum numbers). Added Earnings Date (col 68), 5min (93), and 15min
  (95) momentum to `DEFAULT_COLUMNS`/`shapeRow` (`api/_lib/finviz.js`).
  Each card now shows an "📋 Earnings in/ago N days" badge when a real
  earnings date is verified within ±5 days (`scannerEarningsFlag`,
  js/scanner.js — Finviz's Earnings Date column comes back in a few
  observed shapes like "7/15/2026" vs "8/12/2026 8:30:00 AM", wrapped in
  an `isNaN(d.getTime())` guard since JS Date parsing of non-standard
  formats is notoriously inconsistent), and the detail panel shows
  "Intraday momentum — last 5min / last 15min" with a same-direction-
  vs-reversing note (`Math.sign` comparison against the daily %, not a
  hardcoded assumption about which direction "the move" is in — a stock
  could be a decliner too). Verified live via `vercel dev` + Playwright
  + direct curl of the full column dump: a real earnings date 4 days in
  the past showed "Earnings 4 days ago" correctly, and a card's momentum
  line showed real, distinct 5min/15min percentages from the daily
  change. **Lesson for future sessions**: even a documented "verified
  blocked" gap can be worth re-checking with a full column-range dump
  rather than trusting an old assumption forever — the Sector fix and
  this fix both came from the exact same one curl command.

- **New Finviz fields wired into sort/CSV export too** (a still-later
  `/loop` pass, same session; an audit fork on crypto-scanner.js/
  futures-scanner.js's core sort/filter/heatmap/CSV/refresh-race logic
  this cycle came back clean): the Sector/Earnings/Momentum fields added
  last cycle only showed in each card's detail panel — same "built but
  never wired up" trap this session has caught before (the theme toggle,
  `.stat-tile.is-good/is-bad`, `.serif-num`). Added Sector, EarningsDate,
  Momentum5m%, Momentum15m% to the Stocks CSV export
  (`scannerRowToCsvFields`) and a new "5min Δ" sort button on both the
  Top Gainers and Most Active sort bars (`momentum5m` case in
  `scannerSortRows`) — lets a trader actually rank by what's
  accelerating/stalling right now, not just re-derive it by opening
  every card. The audit fork also flagged one latent (not currently
  reachable) inconsistency: crypto's own momentum-agnostic `pct` sort
  comparator used `Math.abs(c.pct ?? -Infinity)`, which evaluates to
  `+Infinity` for a null pct — futures' equivalent already used the safer
  `c.pct == null ? -Infinity : Math.abs(c.pct)` pattern. Not reachable
  today since `cryptoFilterRow` already excludes null-pct rows before
  any sort call site, but matched to futures' pattern defensively in
  case that filtering ever changes.

- **Earnings-date flag reaches Today's Top Picks too** (a still-later
  `/loop` pass, same session): the badge shipped last cycle only lived
  on each card's own expand/collapse row, but Top Picks is the one place
  in the Scanner explicitly designed to be scannable without opening any
  card — a top pick with earnings today is exactly the kind of risk that
  belongs in the shortlist itself, not hidden behind a click. Reuses
  `scannerEarningsFlag` with zero new logic. Verified live: a real A+
  top pick with earnings today showed the badge correctly in the
  shortlist.

- **Sector filter added to Stocks Filters** (a still-later `/loop` pass,
  same session; a 5th audit fork this cycle covering market-clock.js/
  theme-toggle.js/nav.js/brief.js/strategy-cards.js came back mostly
  clean — market-clock's DST-sensitive wall-clock math, theme-toggle,
  nav.js's title lookup, and strategy-cards' static data all held up):
  a categorical Sector dropdown (the 11 fixed Finviz sector names) in
  the existing Filters card, wired into `scannerFilterRow`, the saved-
  presets system (`PRESET_FIELD_IDS`/`SCANNER_FILTER_DEFAULTS` — the
  preset-save handler needed a small special case since it previously
  assumed every filter field was numeric via `parseFloat`, which would
  have silently saved `null` for a sector string), and Reset-to-defaults.
  Verified live: selecting Technology correctly narrowed 7 gainer cards
  to 1, Reset correctly restored "All sectors."
- **Real bug fixed from the audit fork above**: `js/brief.js` interpolated
  `b.date||b.id` completely unescaped into innerHTML, while the adjacent
  `.text` field used an ad-hoc partial escape (`.replace(/</g,'&lt;')`)
  instead of the shared `escapeHtml` helper (js/state.js) every other
  file uses. Not exploitable through this app's own UI today (no in-app
  form writes to the `briefs` table, only an external scheduled task
  does), but a real defense-in-depth gap and inconsistency with the rest
  of the codebase's XSS-prevention pattern — fixed to use `escapeHtml`
  consistently for both date/id and text.

- **Sector performance panel now uses heatmap-style color intensity** (a
  still-later `/loop` pass, same session): sector pills were flat good/
  bad colored regardless of magnitude, unlike every other heatmap
  surface in the app (Top Gainers/Crypto/Futures). Now uses the same
  `color-mix` intensity-by-magnitude formula, clamped at 5% for full
  intensity — same threshold as the Futures heatmap, since a whole-
  sector aggregate moves even less day-to-day than an individual
  contract. Verified live: a +2.72% sector rendered at the correct
  ~36% intensity mix.
- **First-ever server-side audit fork this session, one real bug
  found and fixed**: every prior audit this session covered client-side
  js/*.js; this cycle covered the remaining api/*.js serverless
  functions (scanner-crypto/-futures/-news, check-alerts, _lib/
  supabase — scanner-gainers.js/_lib/finviz.js were already reasonably
  reviewed while adding the new Finviz columns). Found `api/check-
  alerts.js`'s `getFiredState()`/`saveFiredState()` were the only two
  fetch call sites in the file NOT checking `res.ok`, unlike
  `sendTelegram()`/`sendDiscordWebhook()` in the same file. Concrete,
  realistic (not hypothetical) impact since this runs unattended every
  2 minutes via Supabase pg_cron: a transient Supabase **read** failure
  made the function "fail open" to an empty fired-state, re-alerting
  every condition that already fired earlier that day; a transient
  Supabase **write** failure silently dropped this run's dedup state
  entirely, so the very next 2-minute tick would re-fire the same
  alerts it just sent — both "fails invisible," no error surfaced
  anywhere. Fixed by adding the same `if(!res.ok) throw` guard the
  file's own send functions already use, so a Supabase hiccup now
  surfaces as a clear 502 from the handler instead of silently
  corrupting the dedup state. Not fully live-testable locally (no
  TELEGRAM_CHAT_ID in the dev `.env`, and the write path shouldn't be
  exercised against production's real dedup-state row) — verified via
  syntax check and direct code review; the fix is a narrow, well-
  understood pattern identical to two other functions already in the
  same file.

- **Setup Grade now reflects earnings/momentum risk, not just Pillars**
  (a still-later `/loop` pass, same session; a dead-code/unused-export
  audit fork this cycle came back fully clean — no genuinely dead code
  anywhere in the app after all this session's rapid feature additions):
  `scannerSetupScore` previously only used pillar count + rel-vol +
  news freshness. Now also docks 20 points for earnings within ±2
  trading days (tighter than the ±5-day badge elsewhere — this is
  scoring "is this still a good setup right now," where only the report
  itself and the day around it is the acute risk) and 15 points for a
  5min move already reversing >1% against the daily trend (a real
  "this is stalling out" signal from the momentum data added earlier
  this session, not a guess). Both are real, named risks in this app's
  own reference material — this isn't a new invented rubric, it's the
  existing mechanical score finally seeing data it already had access
  to. Flows through automatically to both the per-card badge and Today's
  Top Picks ranking (both already computed off the same `scannerRowData`
  → `scannerSetupGrade` call, so one change point). Verified live: the
  detail panel's explanatory hint renders the updated copy correctly
  with no console errors.

- **5min momentum reaches the collapsed card too** (a still-later `/loop`
  pass, same session): the momentum data was only visible in the detail
  panel's paragraph, requiring a click to see the exact signal that now
  also feeds Setup Grade's score. Added a "5min Δ" stat tile alongside
  Price/Volume/Rel Vol/Float/Pillars/Setup grade — same at-a-glance
  tier as everything else already there, matching this session's own
  precedent (Rel Vol/Float already exist as both a top-level stat and a
  more detailed pillar-breakdown line; momentum now gets the same
  treatment). Verified live: a real card showing a real -13.40% 5min
  reversal on the collapsed view immediately explained why its Setup
  Grade had been docked, without needing to expand anything.

- **"By day of week" journal stats table added** (a still-later `/loop`
  pass, same session — the first Journal-area feature after several
  cycles focused entirely on the Scanner): a real Tradervue/Edgewonk
  staple ("which days do I actually trade well on") that this app never
  had, despite already storing everything needed (`t.date` as ISO
  `YYYY-MM-DD`). `groupsByWeekday`/`renderStatsByWeekday`
  (js/journal-stats.js) reuse the existing `computeStats` per-group
  pattern already established for By-Strategy/By-Tag, but deliberately
  render in fixed Sun–Sat calendar order rather than sorted by P&L —
  the point is seeing the week's own shape, not a leaderboard. Parsed
  with an explicit `T00:00:00Z` UTC-midnight anchor rather than bare
  `new Date(t.date)`, matching the same UTC-day-boundary convention
  already used app-wide (scanner.js's `scannerTodayStr`, srs.js's
  `todayStr`) so a date string never shifts to the wrong weekday
  depending on the browser's local timezone offset. Verified the
  weekday math directly in Node against the real current date
  (2026-09-15 → correctly resolved to Tuesday) since production's
  Journal currently has zero real trades to visually verify against
  (consistent with this session's standing caution against fabricating
  test trades in the live account) — the empty-state path rendered
  correctly with no crash.

- **By direction and by market stats tables added** (a still-later
  `/loop` pass, same session): two more real Tradervue/Edgewonk
  breakdowns ("am I better Long or Short," "which market do I actually
  make money in") this app never had despite already storing both
  fields (`t.direction`, `t.market`) on every trade. Reuses the existing
  P&L-sorted `statsTableHtml()` helper directly — unlike By-Day-of-Week
  (which needed a fixed calendar order), direction/market have no
  natural inherent order, so the same leaderboard-style sort already
  used for By-Strategy/By-Tag fits correctly. Verified live: both
  tables render the correct empty state with zero real trades in
  production, no crash.

- **Trade Coach's worst/best insight widened to direction and market**
  (a still-later `/loop` pass, same session): insight #5 (worst/best
  strategy or tag by P&L) only searched two candidate pools; now also
  searches By-Direction and By-Market (excluding 'Unspecified', same
  exclusion pattern as strategy's 'Other') using the same
  `groupsByDirection`/`groupsByMarket` just extracted as standalone
  functions (matching `groupsByStrategy`/`groupsByTagFlat`'s existing
  shape) so `renderStatsByDirection`/`renderStatsByMarket` and this
  insight share one implementation instead of two. Caught and fixed a
  real bug before shipping: the first draft called `groupsByDirection`/
  `groupsByMarket` from inside `buildCoachInsights` before those
  functions existed as anything other than inline logic buried inside
  the two render functions — would have thrown a ReferenceError the
  moment insight #5 ran. Verified the corrected logic in Node with
  synthetic trades before trusting it (production's Journal has zero
  real trades to test against) — worst/best correctly identified a
  losing Short-direction cluster and a winning Long-direction cluster.

- **Accessibility fixes on this session's newer Scanner UI** (a
  still-later `/loop` pass, same session): an audit fork specifically
  scoped to UI added AFTER the original accessibility pass documented
  above (price alerts, the two manager panels, sector filter, new
  Journal stats tables, position-size calculator) found two real gaps.
  (1) The shared price-alert mini-form's direction `<select>` and
  target `<input>` had zero accessible name — no `<label>`, no
  `aria-label`, relying only on a `placeholder` (not a reliable
  accessible-name substitute; most screen readers don't announce it
  consistently and it disappears once a value is typed). Fixed with
  `aria-label="Alert direction"`/`"Alert target price"` — since this is
  one shared `scannerPriceAlertFormHtml()` function, the fix applies to
  all 3 markets at once. (2) The Watchlist/Alert manager panels' Jump/
  Remove buttons all rendered with identical literal text across every
  row — a screen-reader user browsing via an AT "list all buttons" view
  (a common NVDA/JAWS navigation mode) would hear "Remove, Remove,
  Remove…" with no way to tell rows apart without reading linearly.
  Fixed with per-row `aria-label`s using the already-available symbol/
  market data (e.g. "Remove FTFT from watchlist"). Everything else
  checked — sector filter's `<label for>`, position-size calculator's
  3 labeled inputs, the new stats tables' `<thead>/<th>` semantics, no
  color-only signals, no div-as-button pattern — came back clean.
  Verified live: both ARIA labels render correctly and are distinct
  per-row.

- **IPO Date wired in; a real duplicate-notification bug fixed** (final
  `/loop` passes, same session): column 70 (IPO Date) was verified live
  in the same 1-100 column dump as Sector/Earnings/Momentum but left
  unwired at the time. Added to `DEFAULT_COLUMNS`/`shapeRow`
  (api/_lib/finviz.js, re-verified live via curl) and a `scannerIpoFlag`
  helper (js/scanner.js) flagging any stock that IPO'd within the last
  12 months in the same sector-context paragraph — a recent IPO trades
  on a much thinner float/history than an established name, the same
  signal the SAC framework's float-based risk sizing already cares
  about. Verified the month-math directly in Node (19mo-ago correctly
  suppressed, 3mo-ago and 5-days-ago both correctly flagged) since no
  ticker in the live scan at test time happened to be inside the recent-
  IPO window. Also fixed a real, confirmed-live duplicate-notification
  bug in `checkScannerPriceAlerts`: a ticker can legitimately appear in
  both Top Gainers and Most Active (confirmed most refreshes have
  several such overlaps), and since `alerts` is captured once before the
  loop while `removeScannerPriceAlert` only updates localStorage, a
  ticker present twice in the combined list could match and fire the
  same one-shot alert twice in a single pass — reproduced live with a
  real crossing before the fix, confirmed silent after it. Added a
  per-call `Set` to skip a key already handled that pass.

## Journal, Practice, and Lessons

- **Journal had a real stored XSS** (fixed) — free-text Instrument/
  Strategy/Tags fields were interpolated unescaped into innerHTML in three
  places. `escapeHtml` now lives in `js/state.js` (shared base module, no
  circular import between `scanner.js` and `journal.js`). A follow-up sweep
  of every other file in the app found no other instances.
- **Practice had a real logic bug** (fixed): `js/app.js`'s app-wide
  `renderAll()` calls `renderPractice()` unconditionally on every page
  load, regardless of which tab is active. `renderPractice()` used to call
  `ensureSession()`, which persisted `newCardsIntroducedToday` (the day's
  10-new-card spaced-repetition budget) to Supabase just from building an
  in-memory queue — meaning the budget was silently spent by loading the
  Dashboard, before the user ever opened Practice. Fixed by moving the
  budget-spend into `answerCurrent()`, only incrementing when a genuinely
  new card is actually answered. **If auditing other pages for similar
  bugs**: the pattern to search for is any function called by the
  unconditional `renderAll()` that has a side effect (a `persistProgress`/
  Supabase write) gated on nothing but "was this rendered," rather than on
  real user interaction.
- **Lessons redesigned** from "every lesson expanded and stacked, filtered
  by a flat theme-pill row" into a table-of-contents-by-theme +
  one-lesson-at-a-time view (`js/lessons.js`: `renderLessonsToc`/
  `renderLessonsSingle`, with Prev/Next navigation through the flat
  `LESSONS` array order). Real user feedback: the old view had no way to
  see the curriculum's shape or focus on one topic.
- **Full app-wide bug sweep completed** for the two bug classes found this
  session: unescaped user text into innerHTML (XSS), and render-path
  functions with hidden `persistProgress`/Supabase side effects (the
  Practice bug's class). Every JS file in the app has now been reviewed —
  Scanner/Crypto/Futures, Journal/journal-stats, Practice, and the last
  batch (Calendar, Milestones, Plan, Dashboard, Brief, market-clock,
  candle-drill, SRS, Glossary) all came back clean on the final pass. If
  a future change reintroduces either pattern, that's a regression, not
  an unknown risk — both have concrete historical examples in git log to
  compare against.
- **Journal analytics expanded** (a later `/loop` pass, same session):
  CSV export of the trade log (`csvEscape`/`downloadCsv` moved from
  `scanner.js` into `state.js` so `journal.js` can import them without a
  circular dependency — `scanner.js` re-exports both for backward
  compatibility with `crypto-scanner.js`/`futures-scanner.js`), Expectancy
  and Max Drawdown stat tiles, an R-multiple distribution histogram
  (`renderRHistogram`), a current win/loss streak tile (shown on both
  Journal and Dashboard via the shared `streakLabel()` export), a daily
  circuit-breaker banner (`computeCircuitBreaker`/`renderCircuitBreaker`
  — fires on the SAC rule's -$100/day-or-3-consecutive-losers condition,
  scaled to the Plan tab's `tc-account-size`), and a search+strategy
  filter on the trade log table (CSV export now exports the filtered
  view, matching the Scanner's "what you see is what you export" rule).
  Per-ticker notes (previously Stocks-only, same gap class as the sort/
  filter parity issue above) were also added to Crypto/Futures, using
  market-prefixed keys (`crypto:SYMBOL`, `futures:SYMBOL`) in the shared
  `tc-scanner-notes` object so a crypto symbol can never collide with a
  stock ticker — the Stocks tab's own unprefixed keys were left
  untouched to avoid a data migration.
- **Trade log gained edit/duplicate, filters, shortcuts, and Coach
  integration** (a still-later `/loop` pass, same session): edit-in-place
  (`startEditTrade`/`editingTradeId`, reusing the "New entry" form —
  fixed a real bug an audit fork caught where a TradingView-imported
  trade's free-text strategy would silently reset to "Trend following"
  on save, since setting a `<select>.value` to a non-matching string is a
  silent DOM no-op; now injects a temporary `<option>`), a "duplicate"
  button for repeated intraday setups (`duplicateTrade`, refactored via a
  shared `populateFormFromTrade` — also resets any in-progress edit
  first, since duplicating while mid-edit would otherwise overwrite the
  wrong trade), search+strategy-dropdown filtering on the trade log, and
  keyboard shortcuts (`js/journal-shortcuts.js`: n/`/`/e/?, mirroring
  `scanner-shortcuts.js`'s guard pattern). Trade Coach now also surfaces
  negative-expectancy-despite-decent-win-rate and 3+ win-streak insights
  from the same `computeStats()` fields the stat tiles already used.
  Two independent audit forks over this surface (one stalled/failed and
  was retried) came back clean apart from the strategy-select bug above.
- **New standalone Glossary reference page** (`#glossary`, `js/glossary.js`
  `renderGlossaryPage`): the 67-term glossary and 21-pattern candlestick
  set both used to exist ONLY as Practice flashcard data, with no way to
  just look something up without going through spaced repetition. Now a
  browsable page with search + category pills, and a Terms/Candlestick
  Patterns segmented toggle (reusing `renderCandleSVG` from
  `candle-drill.js`) — switching tabs resets the search/filter so a
  stale term-category filter can't silently apply to candlestick
  bullish/bearish/neutral categories. Inserted into `nav.js`'s `pages`/
  `titles` arrays between `practice` and `milestones`; verified nothing
  else in the codebase indexes into that array by position.
- **Smaller fixes/additions from the same pass**: Calendar's week-expand
  state was hardcoded to always auto-open week 0 regardless of actual
  progress (`js/calendar.js` `openWeeks`/`autoOpened`) — now opens
  whatever week contains the next unchecked day, once per page load, so
  it doesn't fight manual expand/collapse on later re-renders. The
  Pre-Trading Checklist's own copy said "meant to be re-filled each
  morning" but nothing enforced or showed that — added a `date` field
  and a status pill (saved today / stale-with-date / not saved) rather
  than silently showing a week-old answer as if it were current. Two
  Milestones ("20 stock paper trades logged", "40+ ... expectancy
  checked") gained a live `hint(trades)` computed from `state.trades`
  instead of being pure self-report with zero connection to the Journal
  data that would justify checking them. The clock bar gained a third
  segment for CME Globex futures-session status (`market-clock.js`
  `futuresStatusFromEt`/`futuresSessionStatus` — open / daily-maintenance
  halt 17:00-18:00 ET / weekend-closed Fri≥17:00 through Sun<18:00),
  verified against 14 boundary cases in a standalone script before
  wiring it in; the next-transition countdown is found by stepping
  forward minute-by-minute rather than symbolic date math, to avoid
  day/hour-boundary arithmetic bugs. All "nudge, not lock" additions
  above deliberately don't auto-clear/auto-check anything — self-report
  and manual review stay the source of truth throughout this app.
- **Heatmap, Crypto watchlist, and stats-table consistency pass** (a
  still-later `/loop` pass, same session): the Monthly P&L calendar's
  day cells are now clickable (keyboard-accessible too) to drop that
  date into the trade log's own search box (`filteredTrades()` in
  journal.js now also matches against `t.date`) — connects what used to
  be a dead-end summary number to the actual trades behind it. Navigating
  to a different month via prev/next now clears that heatmap-driven
  filter (tracked via a `heatmapFilterActive` flag so a real manual
  search is never touched) — a real UX gap an audit fork caught. Crypto
  gained the watchlist star + a "Watchlist only" filter it never had
  (only notes existed before) — same `crypto:SYMBOL`-prefixed-key
  pattern as the notes fix, via new exports `getScannerWatchlist`/
  `isScannerWatched`/`toggleScannerWatch` from scanner.js. Deliberately
  NOT added to Futures — that tab is already a fixed 14-contract
  watchlist by design. Dashboard gained an Expectancy tile (previously
  Journal-only), the By-Strategy/By-Tag tables gained an Expectancy
  column (`statsTableHtml` already computed it, just never displayed
  it), and the trade-entry Tags field gained up-to-10 "+ tag" suggestion
  pills ranked by usage frequency — a native `<datalist>` wasn't a good
  fit since it can't sensibly autocomplete one comma-separated segment.
  A second audit fork covering the crypto-watchlist + heatmap-click
  surface came back clean (two non-bug design trade-offs noted, one of
  which — the month-nav filter staleness — was addressed above anyway).
- **Weekly delta, presets, print, and one more Trade Coach insight** (a
  still-later `/loop` pass, same session): the Weekly Performance report
  gained a "▲/▼ X vs prior 7d" line on Total accuracy/P&L (only shown
  once a prior 7-day window actually has trades, to avoid a misleading
  "vs 0 trades" comparison) — a third audit fork verified the date-range
  math has no off-by-one at the window boundary. Crypto gained saved
  filter presets (Supabase-synced under its own `crypto-scanner-presets`
  key, separate from the Stocks tab's `scanner-presets` since the field
  sets differ) — deliberately not added to Futures, which has only one
  categorical filter, not a multi-field combo worth naming. The `w`
  keyboard shortcut, which still said "no watchlist feature" on Crypto
  after the watchlist star shipped, now actually toggles it there; the
  message is now scoped correctly to Futures only. Added meta
  description + Open Graph/Twitter tags (no `og:image` — the only asset
  is an SVG icon, unreliable as a social-preview image across
  platforms). Two Print buttons: the Trading Plan Worksheet prints the
  whole page (it mirrors a single-page PDF), and the Weekly Performance
  report prints ONLY itself via a `print-scope-active` body class
  toggled around `window.print()`/cleared on `afterprint` — a fourth
  audit fork verified `afterprint` reliability and the CSS selector
  scoping. Trade Coach gained an overtrading/revenge-trading insight:
  flags a day with 2x+ the trader's own typical trades/day (min 5 active
  days logged) that also finished net negative, without diagnosing
  intent — just surfaces it for the trader to judge.
- **Print polish + a "built but never wired up" sweep** (a still-later
  `/loop` pass, same session): a fifth audit fork on the two print
  features caught a real regression — `.seg-btn.active` (Direction Long/
  Short, Process-followed Yes/No, Hot/Cold cycle) only distinguished
  itself via `background-color`/`box-shadow`, both stripped by most
  browsers' print output by default and meaningless on a B&W printer
  regardless, so a printed worksheet would've shown every option looking
  identical. Fixed with print-specific bold+underline+border styling.
  A dedicated investigation fork (prompted by realizing the theme-toggle
  CSS below had been fully built with zero JS ever using it) found two
  more of the same pattern: `.stat-tile.is-good`/`.is-bad` (a glowing
  tile-border accent) existed in styles.css but no code ever applied
  those classes — every stat tile only colored its inner `.v` text.
  Added a shared `statTileCls()` helper (state.js) computed once from
  the same 'good'/'bad' string already used for the inner class, so tile
  and value can never disagree, wired into every real stat tile across
  Dashboard/Journal/Weekly-report/Plan (null-guarded so an empty "—"
  never glows). And `.serif-num` (Fraunces) existed but was never
  applied anywhere — applied it to the Dashboard's Day-X/60 hero number
  specifically (not a blanket change across every tile, to avoid an
  unverified visual overhaul); the first attempt was itself silently
  inert due to a CSS specificity tie with `.stat-tile .v`, caught via
  live verification and fixed with an explicit two-class override rule —
  the exact same "looks wired up, isn't" trap this whole sweep was
  chasing, this time self-inflicted and caught immediately.
- **Light/Dark/System theme toggle wired up**: styles.css had a complete
  `:root[data-theme="dark"]` override (with a
  `:not([data-theme="light"])` guard on the `prefers-color-scheme` media
  query, so an explicit light choice could beat a dark system preference
  too) sitting unused — no control had ever set `data-theme`. Added a
  click-to-cycle button in the clock bar (`js/theme-toggle.js`),
  persisted to `localStorage` key `tc-theme`, plus a synchronous inline
  script in `<head>` (before the stylesheet loads) that applies a saved
  choice on first paint to avoid a flash of the wrong theme. The
  button's `aria-label` is set dynamically (not a static string) so
  screen readers announce the actual current/next state, not just a
  generic "toggle theme" label that would've buried the same info
  sighted users get for free from the visible button text.
- **Mobile clock-bar fix + Scanner cross-market parity round** (a
  still-later `/loop` pass, same session): the clock bar's
  `justify-content:center` meant overflowing content (Warsaw time + NYSE
  + Futures + the new theme toggle) landed the default mobile scroll
  position mid-content — text cut off on BOTH edges on first load,
  reading as a rendering bug, and the theme toggle was effectively
  undiscoverable. Fixed with `justify-content:flex-start` under the
  860px breakpoint. Then closed out three more Stocks-only Scanner gaps,
  found by a dedicated audit fork doing a systematic scanner.js-vs-
  crypto/futures-scanner.js comparison: "Log this trade →" (added to
  both Crypto and Futures — unlike watchlist/presets, this isn't a
  screening feature, so it made sense even for Futures' fixed 14-
  contract list; deliberately does NOT pre-fill the Journal's "Stock %
  gain on day" Pillars field for either, since that field is stock-
  specific), a visible keyboard-shortcut hint line on the Journal page
  (mirroring the Scanner's own, since the shortcuts existed but were
  undiscoverable without already knowing to press `?`), and a Cards/
  Heatmap toggle on Crypto's Top Movers (own `cryptoHeatmapTileHtml()`
  keyed off `.symbol` rather than reusing scanner.js's `.ticker`-based
  version; intensity clamps at a 20% move vs. Stocks' 50%, since crypto
  swings bigger day-to-day). The fork also flagged proactive browser-
  notification alerts and the Telegram/Discord alerts panel as
  Stocks-only, but correctly scoped those out — extending either needs
  new trigger logic or server infra, not just wiring an existing feature
  through, unlike the true "parity fix" gaps closed above.
- **Heatmap reaches all 3 markets + a clean audit checkpoint**: a
  dedicated audit fork on the Crypto heatmap and both `__logCryptoTrade`/
  `__logFuturesTrade` handlers came back fully clean (correct null-
  guarding via `cryptoFilterRow`, correct single-quote escaping in the
  generated `onclick` attributes, no stale-state issues from switching
  views or navigating away mid-refresh). A manual sweep across all 10
  pages plus all 3 Scanner sub-tabs also showed zero console errors.
  Then added Heatmap to Futures too (`futuresHeatmapTileHtml`, `fut-view`
  toggle) — rated only medium-confidence by the earlier parity-audit
  fork since a fixed 14-contract list has less to gain from a heatmap
  than a large scannable universe, but "which contracts moved today at a
  glance" is the same real use case regardless of list size. Intensity
  clamps at a 5% move for full color (vs. Crypto's 20%, Stocks' 50%),
  since futures move far less day-to-day than either.
- **Keyboard shortcuts finished their sweep across the app** (a
  still-later `/loop` pass, same session): Lessons gained Left/Right
  arrow-key navigation between lessons (only while a lesson is actually
  open, not the table-of-contents), Practice gained 1-4 to answer a
  flashcard and Enter/Space to advance — the highest-value of this
  batch, since a spaced-repetition drill is exactly the repetitive
  interaction keyboard review helps most (same reasoning as Anki/
  Quizlet) — and Glossary gained `/` to focus search plus 1/2 to switch
  the Terms/Candlestick-Patterns tabs. Every one of these shipped with
  its own visible hint line in the same commit, rather than repeating
  the undiscoverable-shortcut mistake the Journal's hint had to fix
  after the fact. Calendar/Milestones/Plan/Dashboard/Brief were
  deliberately left without shortcuts — none of them have the kind of
  repetitive per-item interaction (answer/advance, search/filter,
  tab-switch) that keyboard shortcuts meaningfully speed up elsewhere in
  this app; they're mostly one-off checkbox/form pages.
- **Dashboard grew two direct-action shortcuts** (a still-later `/loop`
  pass, same session): "Mark today done" lets a user check off today's
  calendar day right from the Dashboard's own "Today's focus" card
  instead of navigating to Calendar and finding today's row —
  `toggleCalDay` exported from calendar.js and reused directly (via
  `window.__markTodayDone`, matching the `__logScannerTrade`-style
  onclick-global pattern already used elsewhere) so it writes through
  the exact same Supabase path, no duplicated persistence logic. And
  Trade Coach's top insight (watchouts sorted first) now shows on the
  Dashboard too, not just Journal — matching the page's own "your
  standing at a glance" framing, which previously excluded the single
  piece of feedback most likely to actually change behavior. Hidden
  below the same 5-trade minimum `buildCoachInsights` itself uses, so it
  never shows the "log more trades" filler message as if it were real
  insight. Both features were verified live then reverted/cleaned up
  (a real calendar-day toggle and 5 real trades) to avoid leaving test
  pollution in the account's actual progress data. An audit fork on both
  came back clean — no double-write race on rapid clicks (renderDashboard
  re-renders synchronously before the Supabase write resolves, so
  findTodayKey() already reflects the change), and buildCoachInsights'
  plan-dependent branches all null-guard correctly against the default
  empty `state.planState = {}`.
- **Fixed a real, commonly-hit bug**: re-importing a TradingView Strategy
  Tester CSV duplicated every previously-imported trade, since
  TradingView's export is always the full trade history (there's no
  "export only new trades" option) — a completely normal workflow (add a
  few more trades, re-export, re-import) silently doubled the journal.
  Each entry's notes field already carries a unique "Trade #N" from
  TradingView's own numbering, so `(instrument, notes)` against trades
  already tagged `source==='tradingview'` is a reliable dedup key with no
  new field needed. Verified live across all three cases — full
  duplicate, partial overlap, and a fresh import — via real CSV files
  built and uploaded through Playwright, with `window.prompt` stubbed to
  answer the Instrument/Strategy prompts non-interactively.
- **Curriculum-vs-code gap-hunting found two more real issues** (a
  still-later `/loop` pass, same session): the Calendar curriculum's own
  Week 12 copy tells the user to "track your Beta streak in the Journal
  and Milestones tabs," but no such concept existed in code anywhere —
  the inverse of the "built but never wired up" bugs found earlier
  (content describing a feature that was never built, rather than a
  feature built with no UI). Added a Beta-phase milestone hint computing
  the two objectively-trackable halves of the rule (a day with a logged
  5/5-Pillars trade, and that day's net P&L positive) as a consecutive-
  day streak; explicitly does NOT claim to verify MACD/volume
  confirmation, since that's not a field this Journal captures. Verified
  live with three real scenarios (0/10 baseline, building a 2-day
  streak, a red day correctly resetting it) via crafted trades with all
  the Pillars-qualifying fields filled in. Then found a real, more
  serious bug while looking at pillarsCount usage: `computePillars()`
  ran unconditionally on EVERY logged trade regardless of Market, so an
  Options/Futures/Crypto trade (e.g. a crypto entry at $45,000, wildly
  outside the Pillars' $2-$20 stock price range) got a misleadingly low
  Pillars score in the trade log, and unfairly counted against Trade
  Coach's "trading outside your own setup criteria" insight — a rubric
  that was never meant to apply to it (the Scanner tab already
  deliberately has no Pillars/Setup-Grade for Crypto/Futures for this
  exact reason). Fixed by only computing Pillars for `market ===
  'Stock'`; other markets store `null`, which the existing "—" trade-log
  fallback and Trade Coach's `typeof pillarsCount === 'number'` filter
  both already handled correctly with zero further changes needed.
  Verified live: a Crypto trade now shows "—", a Stock trade still shows
  a real score.
- **Print pass finished; Beta streak semantics clarified**: added a
  Print button to the Daily Brief page (rounds out the earlier Trading
  Plan Worksheet/Weekly Report print buttons — same "once-a-day text
  content worth keeping at the desk" use case; the generic `@media
  print` rules already apply, no scoped print-active class needed since
  the whole page is already one focused list). A sixth audit fork on the
  Pillars per-market fix and Beta streak came back clean on the former
  and flagged a real semantic ambiguity on the latter: the streak counts
  consecutive qualifying TRADING days, not calendar days (matches
  computeStats()'s own currentStreak elsewhere — consistent precedent,
  not a new bug), but "10 straight trading days" in the milestone's own
  description could otherwise read as calendar days. Made this explicit
  in the hint copy rather than leaving it for a user to discover the
  hard way after a long dormant gap.
- **Position size calculator added to Plan tab** (a still-later `/loop`
  pass, same session): thinkorswim/TC2000/Trade Ideas all have this; the
  existing Risk rules calculator only showed flat % of account $ amounts,
  never tied to an actual entry/stop distance. New calculator
  (`renderPositionSizeCalc`, js/plan.js) takes risk % + entry + stop →
  $ at risk, risk/share, shares/coins/contracts (floored), and position
  value — the "right share size" leg of the SAC framework's 4-part
  filter, sized to a real stop distance instead of a flat guess. Flags
  two real edge cases rather than silently showing 0 or a misleading
  number: a stop too far from entry for the risk budget (0 shares), and
  a position that costs more than the whole account (only possible with
  margin, which the SAC framework's own reference material says a cash
  account doesn't have). Verified live via `vercel dev` + Playwright:
  the math checked out exactly (2% of $1,000 / $0.30 risk-per-share =
  66 shares, not 67 — floored correctly), and both edge-case warnings
  fired on the inputs designed to trigger them.
- **Two real bugs fixed from an audit fork on journal.js/journal-stats.js**
  (same `/loop` pass): (1) the trade-log Pillars column used `if(!pc)`
  to detect "no pillars data" (`js/journal.js`), which is also true for
  `pc === 0` — a Stock trade that legitimately scored 0/5 pillars
  rendered as "—" (same as a Crypto/Futures/Options trade where Pillars
  correctly doesn't apply), indistinguishable from "not applicable."
  Fixed to `pc == null`. (2) Trade Coach's "active losing streak" insight
  (`buildCoachInsights` #4, `js/journal-stats.js`) used a different,
  disagreeing streak definition than `computeStats.currentStreak` (used
  by the circuit-breaker banner) — it walked trades in raw Supabase
  query order (date-only, no secondary sort) and `break`d on a $0
  breakeven trade instead of skipping it, so a real 3-loss streak with a
  breakeven mixed in could under-count and never fire the Rule-3 tip
  even while the circuit breaker was already showing "stop trading."
  Fixed to sort by date+createdAt and skip (not break on) breakeven
  trades, matching computeStats exactly. Also cleaned up a dead
  ternary (`tradesSortDir = key === 'date' ? 'desc' : 'desc'` — both
  branches identical) that read like a dropped ascending-default branch
  but wasn't a functional bug.
- **Cross-market watchlist manager panel** (a still-later `/loop` pass,
  same session; a code-quality audit fork on calendar.js/milestones.js/
  dashboard.js this cycle came back clean, no bugs found): same class of
  gap as the price-alert manager above — the ★ was only ever a per-tab
  filter toggle, no single place to see every starred symbol across
  markets with a live price. New `#sc-watchlist-manager-card`
  (`renderScannerWatchlistManager`, js/scanner.js) lists Stocks + Crypto
  watch-starred symbols (Futures deliberately excluded — no watchlist by
  design, a fixed 14-contract list doesn't need one) with live price/%
  pulled fresh from each market's own localStorage cache, plus Jump/
  Remove per row. Reads `'tc-crypto-cache'` as a literal string rather
  than importing crypto-scanner.js's own cache-key constant, since
  crypto-scanner.js already imports from this file — importing back
  would be circular; the literal is commented so it's kept in sync if
  that constant ever changes. Same `sc-watchlist-changed` DOM-event
  cross-tab-sync pattern as the price-alert manager: removing a crypto
  watch star from the panel while the Crypto tab is hidden updates that
  tab's own ★ immediately rather than waiting for its next refresh.
  Verified live via `vercel dev` + Playwright: starred one stock + one
  coin, both appeared with correct live prices (crypto's sub-$1
  precision handled correctly), Jump switched tabs correctly, and
  removing the crypto entry from the Stocks tab correctly un-starred it
  on the Crypto tab without needing to switch there first.
- **Bulk select + delete on the trade log**: a checkbox column, tri-state
  "select all" (checked/indeterminate/unchecked, recomputed against
  whatever the current search/filter view actually shows), and a "Delete
  selected (N)" button using a single Supabase `.delete().in('id', ids)`
  batch call instead of N individual requests. Real friction point once
  duplicate imports, edit-in-place, and duplicate-trade had all made the
  log easy to grow quickly — cleaning up a bad import used to mean
  deleting one at a time. Selection deliberately resets on every render
  (not persisted) so a stale selection can never silently carry over to
  a different filtered view; reuses the same stale-edit-form guard the
  single-trade delete already has. Verified live: partial selection,
  indeterminate select-all, and a real 3-trade batch delete via the
  actual UI.

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
