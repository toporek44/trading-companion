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
| Today's Top Picks digest | Trade Ideas' Holly daily picks | Free, same underlying data already being fetched; count is user-configurable (3/5/10) |
| Heatmap view | TC2000's signature feature | Implemented for Top Gainers |
| Saved scan presets | TC2000 EasyScan, TradingView, Trade Ideas | Implemented, Supabase-synced across devices; a "Reset to defaults" button gives a one-click way back to the $2-$20/10%/500k baseline |
| CSV export | Benzinga Pro, TC2000, TradingView | Implemented on all 3 tabs |
| Keyboard shortcuts | TC2000, Thinkorswim | Implemented (tab switch, refresh, export, watchlist) |
| Audio + Discord/Slack + Telegram alerts | Trade Ideas (audio), TradingView (webhooks) | All three, plus a "test sound" preview button |
| Per-ticker notes | TC2000's watchlist context menu | Implemented on all 3 tabs (was Stocks-only for a while — same class of gap as sort/filter below; text-only, no charting surface to attach to) |
| Trade journal filter/search | Tradervue, Edgewonk | Free-text search (instrument/tags/notes) + strategy dropdown + market (Stock/Options/Futures/Crypto) dropdown on the trade log; CSV export honors the active filter |
| Expectancy, Max Drawdown, R-multiple distribution, win/loss streak | Tradervue, Edgewonk | All four computed from the same trade log, no extra data entry |
| Daily circuit-breaker banner | None seen in any researched paid tool — this is novel | Surfaces the SAC strategy's own "-$100/day or 3 straight losers" rule as an active warning, scaled to account size; a nudge, not a lock |
| Always-visible Today P&L | thinkorswim/Webull's persistent account P&L header | A "Today: +$X" badge in the fixed clock bar, visible from every page (not just Journal/Dashboard); hidden on a day with zero trades logged |
| 24/7 coverage (crypto + futures tabs) | Most paid scanners are single-market | 3 markets in one app, unified card UI |
| PWA installable (home-screen icon) | Webull/TC2000 mobile apps | Implemented this session (manifest + icon + no-op service worker) |
| Sortable/filterable columns on every market tab | Every paid scanner (table sort is table-stakes) | Was Stocks-only for a while (a real gap a user flagged) — Crypto and Futures now have matching sort pills + filters (Futures uses a categorical Group filter — Index/Energy/Metals/Rates/Currency/Crypto — instead of numeric fields, since 14 fixed contracts spanning wildly different price scales don't suit a min/max price filter) |
| Trade log edit/duplicate | Tradervue, Edgewonk | Edit-in-place and a "duplicate" button for repeated intraday setups (was add/delete only) |
| Keyboard shortcuts on the Journal | TC2000, Thinkorswim | n/`/`/e/? — mirrors the Scanner's own shortcut file |
| Browsable glossary + candlestick reference | thinkorswim's glossary, Investopedia | Both existed only as Practice flashcard data before — now a standalone searchable page, no spaced-repetition flow required |
| Futures session status (open/halted/weekend) | Most retail tools just show "market hours" for stocks | Third clock-bar segment for CME Globex's own nearly-24/5 schedule, since this app's Futures tab needed it and nothing surfaced it live |
| Clickable P&L calendar | Most journal calendars are read-only heatmaps | Clicking a day jumps to and filters the trade log to that date, instead of leaving the number a dead end |
| Crypto watchlist | TC2000/Trade Ideas watchlists | Star + "Watchlist only" filter (Crypto had notes but never the star itself) |
| Tag suggestion pills | Tradervue's tag autocomplete | Up to 10 most-used tags as one-click pills, avoiding the exact-string-match fragmentation a retyped/misspelled tag causes in By-Tag stats |
| Week-over-week delta | Most journals show absolute numbers only | Weekly report shows accuracy/P&L change vs. the prior 7-day window |
| Crypto saved filter presets | TC2000 EasyScan, TradingView | Same named-combo pattern as the Stocks tab, own Supabase key; also gained its own "Reset to defaults" button (also resets Watchlist-only back to All) |
| Printable Trading Plan + Weekly Report | Most tools are screen-only | Both mirror this app's own reference PDFs (sample-trading-plan.pdf, weekly-reporting-template.pdf); the Weekly Report prints itself in isolation, not the whole page |
| Overtrading/revenge-trading detection | None seen in any researched paid tool | Trade Coach flags a day with 2x+ typical trade count that also finished negative — the Lessons deck defines the concept, this connects it to real Journal data |
| Hold-time asymmetry detection | None seen in any researched paid tool | Trade Coach flags when losing trades are held 1.5x+ longer than winners on average — "cut winners short, let losers run," using the holdTime/holdUnit fields already captured on every trade |
| Light/Dark/System theme toggle | Every paid tool has this | Existed as fully-built CSS for a while with zero UI control — this session closed that gap, plus a matching stat-tile glow accent and a hero-number serif treatment that had the same "wired in CSS, never used" problem |
| "Log this trade →" on every market | Some tools link a screener to an order ticket | Was Stocks-only; now on Crypto and Futures too, jumping to a pre-filled Journal entry |
| Heatmap view on all 3 markets | TC2000's signature feature | Was Stocks-only; Crypto and Futures now get the same color/size-by-%-change tiles, each with its own intensity threshold tuned to how much that market actually moves day-to-day |
| Keyboard-first review (Practice) | Anki, Quizlet | 1-4 answers a flashcard, Enter/Space advances — no mouse needed for a full review session |
| Keyboard nav on Lessons + Glossary | Most learning tools are click-only | Arrow keys move between lessons; `/` + 1/2 search and switch tabs on Glossary |
| Dashboard direct actions | Most dashboards are read-only summaries | "Mark today done" and Trade Coach's top insight both live right on the Dashboard, not just their source pages |
| TradingView re-import dedup | Most journal importers don't guard against this | TradingView's Strategy Tester export is always the full history, not incremental — re-importing after new trades (a normal workflow) used to duplicate everything already imported |
| Beta-phase streak tracking | None seen in any researched tool | The curriculum's own copy promised this in two places; now actually computed from real Journal data instead of just being an instruction to track it manually |
| Pillars scoring stays honest per-market | — | Fixed a bug where Options/Futures/Crypto trades got scored against stock-only Pillars criteria and unfairly dinged Trade Coach's discipline insight |
| Print on every text-heavy page | Most tools are screen-only | Trading Plan Worksheet, Weekly Report, and Daily Brief all get a real print path now |
| Bulk delete on the trade log | Tradervue, Edgewonk | Checkbox column + tri-state select-all + a single batched delete call, instead of deleting a bad import one trade at a time |
| Bulk tag on the trade log | Tradervue, Edgewonk | Same checkbox selection as bulk-delete, adds one tag to every selected trade (dedup, case-insensitive) — no single-call batched update with differing values in Supabase's client, so N individual updates under the hood, still one user interaction |
| Sortable trade-log columns | Tradervue, TC2000 | Date/Instrument/Result/R headers toggle asc/desc (▲/▼, aria-sort); defaults to date-desc so nothing changes until a user clicks one; search/filter/CSV export all honor the active sort since it lives inside `filteredTrades()` |
| Expandable thesis/notes in the trade log | Tradervue's row expand | Notes were captured on entry but only ever visible via edit mode; the Instrument cell is now clickable (only when notes exist) and expands an inline detail row |
| Per-ticker price target alerts | thinkorswim, TC2000, Webull | Above/below target per ticker/coin/contract on all 3 markets, fires a browser notification once via the existing alert chime/Notification infra, then auto-clears (one-shot, unlike the daily-reset Pillars/news alerts) |
| Cross-market alert manager panel | thinkorswim, TC2000 | One list above the market tabs showing every armed price alert across all 3 markets at once, with Jump/Remove per row, instead of hunting for a 🔔 badge on each tab |
| Position size calculator | thinkorswim, TC2000, Trade Ideas | Risk % + entry + stop → $ at risk, risk/share, shares/contracts (floored), position value, with 0-shares and over-account-size warnings — the existing risk calculator only showed flat % of account amounts, never tied to a real stop distance |

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
