# Scanner upgrade: Alpha Vantage (free) → Finviz Elite (paid)

Status: **implemented and verified live against real Finviz Elite data
(2026-09-12).** `api/scanner-gainers.js` calls Finviz Elite's screener
export; `js/scanner.js` tries it first and falls back to the Alpha
Vantage flow automatically when `FINVIZ_API_KEY` isn't set. Both the
column IDs and their unit conventions were confirmed against a real key
and are documented in the code — see "What got resolved" below.

*(This plan originally recommended Financial Modeling Prep; a second,
more skeptical research pass found Finviz Elite is cheaper and
architecturally simpler for this exact use case. FMP is no longer used
anywhere in this repo. History of that comparison is kept below for
context.)*

## Why the Scanner needed an upgrade at all

The free-tier Alpha Vantage flow (still the fallback path) has three real
limitations:
1. **~25 requests/day cap** — 1 call per manual Refresh + 1 call per
   per-ticker "Check news", capping how many tickers can be checked daily.
2. **No real relative-volume or float data** — those two pillars require
   the user to manually enter an average-volume baseline and float per
   ticker.
3. **Delayed, end-of-run data** — fine for a watchlist-builder, not for
   real-time execution.

## Why Finviz Elite over Financial Modeling Prep

- **One HTTP call instead of ~4–32.** Finviz's export endpoint
  (`GET https://elite.finviz.com/export.ashx?v=111&f={filters}&ft=4&c={columns}&auth={API_KEY}`,
  plain CSV) returns Price, Change%, Volume, Average Volume, and Relative
  Volume in one response — confirmed columns, verified against Finviz's
  own official help docs. FMP's approach (gainers list → batched quote
  call → up to 15–30 parallel per-symbol float calls) is the N+1 problem
  this avoids.
- **Cheaper**: $39.50/mo, or $24.96/mo billed annually, vs. FMP Starter's
  $49/mo.
- **Real-time + extended-hours data included** — Elite gives real-time
  quotes plus premarket data from 4:00am ET and after-hours to 8:00pm ET,
  matching this system's actual 7–11am trading window. This was never
  confirmed for FMP's Starter tier.
- **Official, documented Elite feature** — not a scraping workaround, so
  no ToS risk.
- **7-day free trial, no card required, plus a 30-day money-back
  guarantee** — low-risk to verify data quality before committing.
- Free brokerage APIs (Schwab, Interactive Brokers, Tradier) were also
  checked as $0 alternatives and ruled out for practical reasons, not
  data quality: Schwab's OAuth tokens need re-authentication roughly
  every 7 days for individual-developer apps (incompatible with a "set
  env vars once" serverless model); IBKR's scanner only works over a
  persistent socket to a running desktop TWS/Gateway process, impossible
  from a stateless serverless function; Tradier requires an actual funded
  brokerage account and no confirmed movers/gainers endpoint exists in
  its public docs.

## What got resolved once a real key was available

Two things were genuinely unverifiable from research alone and needed a
live key to confirm — both are now resolved and documented in
`api/scanner-gainers.js`:

1. **The view parameter matters.** `v=111` (Finviz's "Overview" view)
   silently ignores the `c=` column-selection parameter and always
   returns its own fixed default columns — a live test confirmed this by
   requesting `c=1,65,66,67,63,64` and getting back `No., Ticker,
   Company, Sector, Industry, Country, Market Cap, P/E, Price, Change,
   Volume` instead. Switching to `v=152` (the "Custom" view) makes `c=`
   work exactly as expected.
2. **Column IDs and their units.** Confirmed live: `1`=Ticker, `65`=Price,
   `66`=Change, `67`=Volume, `63`=Average Volume, `64`=Relative Volume,
   `25`=Shares Float. Critically, **the raw CSV export has no K/M/B
   suffix letters** (unlike Finviz's UI display) — each column has a
   fixed implicit scale instead: Volume is a plain share count, Average
   Volume is in **thousands** of shares, and Shares Float is in
   **millions** (which conveniently already matches this app's own
   `floatM` convention with zero further conversion). This was verified
   by cross-checking the derived relative volume (`volume / avgVolume`)
   against Finviz's own reported Relative Volume figure for the same row
   and confirming they matched.

`api/scanner-gainers.js` still parses the CSV **by header name**, not
column position, so if Finviz ever reorders columns or you customize
`FINVIZ_COLUMNS` (a Vercel env var), it keeps working without a code
change.

## Also added: short interest + server-side strategy filters + auto news

- **Short Float % and Short Ratio** (Finviz columns 30/31, verified live)
  — the exact data point Ross Cameron's video names as what a real paid
  scanner shows that a free one usually can't. High short interest on a
  low-float mover is a classic squeeze setup. Shown as its own sortable
  column in both Scanner tables.
- **Server-side filters** (`FINVIZ_FILTERS` env var, override the
  default): `sh_float_u20` (float under 20M) and `sh_relvol_o2`
  (relative volume over 2x) added on top of the existing price/change
  filters, so Finviz only returns candidates already matching the
  strategy's float/volume requirements instead of the scanner relying
  entirely on client-side Pillars scoring after the fact. Verified live:
  cuts a ~356-row unfiltered result down to ~37 qualified rows.
- **Auto news-check for the top 8 gainers** on every refresh (Finnhub
  free tier, 60 calls/min, has plenty of headroom) — the 🔥 freshness
  badge now appears without a manual "Check news" click. Requires
  `FINHUB_API_KEY` to be set; silently no-ops otherwise rather than
  firing doomed requests.

## The architecture change this required

Paid API keys can't ship in client-side code (unlike Alpha Vantage's
free, consumer-facing key) — every paid provider's terms prohibit it.
Fixed with a Vercel serverless function under `api/`, which Vercel
auto-serves with no separate hosting and no change to the rest of the
app's "no build step" static-site nature:

- `api/scanner-gainers.js` — calls Finviz's export endpoint server-side
  (key read from `FINVIZ_API_KEY`, never sent to the browser)
- `api/scanner-news.js` — unchanged, still calls Finnhub's company-news
  endpoint server-side per ticker for real publish timestamps

Both report `{configured: false}` when their env var isn't set, so
`js/scanner.js` falls back to the Alpha Vantage flow automatically — this
keeps the repo usable by anyone who forks it without paying for anything.

## Data mapping

| Field | Alpha Vantage (fallback) | Finviz Elite (once configured) |
|---|---|---|
| Price / % change / volume | `TOP_GAINERS_LOSERS`, auto | Finviz export, auto |
| Relative volume | Manual: enter avg-volume baseline once per ticker | **Automatic** — from Finviz's Avg Volume / Relative Volume columns |
| Float | Manual: enter float once per ticker | **Automatic** — from Finviz's Shares Float column |
| Float rotation | Computed client-side (unchanged formula) | Computed client-side (unchanged formula) |
| News + freshness | `NEWS_SENTIMENT`, 1 call/ticker/day, cached | Finnhub company-news (unchanged), same caching/freshness logic |

## Rollout steps

1. ~~Sign up for Finviz Elite~~ — done, key added to `.env` locally and
   to the Vercel project's environment variables.
2. Get a Finnhub API key (free tier) if not already done — still uses
   the free tier, no cost, for news-freshness only.
3. ~~Add as Vercel environment variables~~ — `FINVIZ_API_KEY` done.
4. ~~Redeploy and verify~~ — done. Verified locally with `vercel dev`
   (which auto-loads `.env`): the Scanner tab's Refresh correctly shows
   "live scanner (float & relative volume computed automatically)", with
   real gainers, real relative volume, and real float rendering in both
   tables, Pillars scoring correctly, zero console errors.
5. ~~Resolve Float's column ID~~ — done, see "What got resolved" above.
6. **Remaining**: spot-check a few known small-cap tickers' numbers
   against Finviz's own UI directly (not just the internal relative-volume
   cross-check already done) before trusting this for real trades — and
   confirm the production deployment (not just local `vercel dev`) picks
   up the Vercel-side env var correctly after the next deploy.

## Not in scope for this task

- Real-time streaming (WebSocket) — a "refresh on click" watchlist tool
  doesn't need it; revisit only if live-updating rows without a manual
  refresh becomes a real requirement.
- MACD-based auto-scoring in the Pillars badge — the MACD+volume check
  from the Lessons content stays a manual visual chart check, not an
  automated Scanner field, unless a future data source makes this trivial
  to add.
