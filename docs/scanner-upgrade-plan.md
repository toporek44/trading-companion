# Scanner upgrade: Alpha Vantage (free) → Financial Modeling Prep (paid)

Status: **implemented, pending API keys.** `api/scanner-gainers.js` and
`api/scanner-news.js` are live in the repo and deployed; `js/scanner.js`
tries them first and falls back to the Alpha Vantage flow automatically
when `FMP_API_KEY`/`FINNHUB_API_KEY` aren't set. Verified locally with
`vercel dev` that both endpoints correctly report `configured:false` and
the client falls through cleanly. **Not yet verified against real FMP/
Finnhub data** — that requires actually signing up and adding the keys
(see "Rollout steps" below, now the only remaining step).

## Why

The current Scanner (`docs/reference/` PDFs' 5-Pillars system, implemented
against Alpha Vantage's free tier) works but has three real limitations:

1. **~25 requests/day free-tier cap** — 1 call per manual Refresh
   (`TOP_GAINERS_LOSERS`) + 1 call per per-ticker "Check news"
   (`NEWS_SENTIMENT`), which caps how many tickers can be checked per day.
2. **No real relative-volume or float data.** Alpha Vantage's free
   endpoints only return price/%change/volume — the user manually enters
   an average-volume baseline and float per ticker for the scanner to
   compute relative volume and float rotation itself.
3. **Delayed, end-of-run data**, not a live feed — fine for a
   watchlist-building tool, not for real-time execution.

User is OK paying $50–80/month once the tool is actually producing value.

## Recommendation (from prior research pass)

**Financial Modeling Prep** (Starter $49/mo or Premium $99/mo) — the only
provider surveyed with a purpose-built trio matching the 5-Pillars system
directly:
- Top Gainers / Most Active endpoint (replaces `TOP_GAINERS_LOSERS`)
- Stock Screener endpoint (price range, volume, exchange filters)
- **All Shares Float endpoint** — real float data, removing the manual
  float-entry step entirely
- Quote/fundamentals endpoints include `avgVolume`, enabling **automatic
  relative-volume calculation** (`volume / avgVolume`), removing the
  manual average-volume-baseline step entirely

Paired with **Finnhub's free tier** for company news with real publish
timestamps (replaces `NEWS_SENTIMENT`) — no reason to pay for a dedicated
news API (e.g. Benzinga, ~$166+/mo) until the account is profitable.

Full comparison against Polygon.io, Twelve Data, Tiingo, Alpaca, Benzinga,
EODHD, and IEX Cloud (confirmed shut down Aug 2024) is in the prior
research pass — FMP won on being the only one with a real float field and
a pre-built gainers/screener endpoint instead of requiring the app to pull
raw market-wide aggregates and filter/compute everything client-side.

## The architecture change this requires

**This is the important part.** Every paid provider's terms prohibit
exposing the API key in client-side browser code — unlike Alpha Vantage's
free tier, which is explicitly designed for consumer/client-side use with
a user-supplied key. `trading-companion` is currently a pure static site
(`index.html` + `styles.css` + `js/*.js`, no backend, no build step).

Fix: add **Vercel serverless functions** under `api/` — Vercel serves any
file in `api/*.js` as a serverless function automatically, no separate
hosting, no change to the "no build step" static-site nature of the rest
of the app:

- `api/scanner-gainers.js` — calls FMP's gainers/screener + float
  endpoints server-side (key read from a Vercel env var, never sent to
  the browser), returns the already-filtered/shaped JSON the client needs
- `api/scanner-news.js` — calls Finnhub's company-news endpoint
  server-side per ticker, returns just the latest headline + timestamp

The browser's `js/scanner.js` calls `/api/scanner-gainers` and
`/api/scanner-news` instead of hitting Alpha Vantage directly — from the
client's perspective, still simple `fetch()` calls to same-origin URLs,
no CORS issues, no key ever visible in the Network tab.

## Fallback behavior (keep the app usable without a paid key)

Rather than a hard cutover, the serverless functions should check for
`FMP_API_KEY/FINNHUB_API_KEY` env vars: if unset, return a clear "not
configured" response and the client falls back to today's Alpha-Vantage
manual-key flow. This keeps the repo/app usable by anyone who forks it
without requiring them to pay for FMP, while unlocking the upgraded path
once the user adds their own key to this Vercel project's env vars.

## Data mapping changes in `js/scanner.js`

| Field | Today (Alpha Vantage) | After (FMP + Finnhub) |
|---|---|---|
| Price / % change / volume | `TOP_GAINERS_LOSERS`, auto | FMP gainers/screener, auto |
| Relative volume | Manual: user enters avg-volume baseline once per ticker | **Automatic** — `volume / avgVolume` from FMP quote data |
| Float | Manual: user enters float once per ticker | **Automatic** — FMP All Shares Float endpoint |
| Float rotation | Computed client-side (unchanged formula) | Computed client-side (unchanged formula) |
| News + freshness | `NEWS_SENTIMENT`, 1 call/ticker/day, cached | Finnhub company-news, same caching/freshness-bucket logic, just a new data source |
| MACD (for the new MACD+volume lesson) | Not available today | Stretch goal — FMP has technical-indicator endpoints; confirm exact endpoint/params during implementation |

## Rollout steps — remaining

1. Sign up for FMP Starter ($49/mo) — confirm at signup whether real-time
   vs. slightly-delayed data requires Starter or the next tier up, and
   whether the gainers/actives/quote/shares_float endpoints used here are
   all included at that tier (unconfirmed in research).
2. Get a Finnhub API key (free tier).
3. Add both as Vercel environment variables: `vercel env add FMP_API_KEY`
   and `vercel env add FINNHUB_API_KEY` (production + preview).
4. ~~Implement `api/scanner-gainers.js` and `api/scanner-news.js`~~ — done.
5. ~~Update `js/scanner.js`~~ — done. Note: manual float/avg-volume input
   fields were kept rather than removed, now pre-filled with the automatic
   value and still overridable (a manual entry always wins over the
   automatic one) — this was simpler and safer than removing the fields
   outright, and covers symbols FMP's float endpoint doesn't have data for.
6. Redeploy (env var changes need a new deployment to take effect —
   `vercel --prod` or push a commit) and check the Scanner tab's Refresh:
   status text should say "live scanner (float & relative volume computed
   automatically)" instead of falling through to the Alpha Vantage message.
7. Spot-check a few known small-cap tickers' float/relative-volume numbers
   against a trusted source to confirm FMP's data is accurate for this
   use case before trusting it for real trades.

## Not in scope for this task

- Real-time streaming (WebSocket) — FMP's REST endpoints are sufficient
  for a "refresh on click" watchlist-building tool; revisit only if the
  user wants live-updating rows without a manual refresh.
- MACD-based auto-scoring in the Pillars badge — the MACD+volume check
  stays a manual visual chart check per the Lessons content, not an
  automated Scanner field, unless FMP's technical-indicator endpoint
  proves easy to integrate during implementation.
