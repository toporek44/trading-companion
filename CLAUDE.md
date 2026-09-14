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
