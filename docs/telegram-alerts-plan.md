# Telegram phone alerts

Status: **fully live.** Runs automatically every 2 minutes via Supabase
`pg_cron`+`pg_net` (not an external service) — no browser needed at all.

## Why this exists

The Scanner tab's browser-notification alerts (see `docs/scanner-upgrade-plan.md`)
only fire while the tab is open in a browser. The user wants alerts that
reach their phone regardless of whether any browser is open — this
requires something running **server-side on a schedule**, independent of
any client.

## Why not Vercel Cron

Vercel's Hobby (free) plan caps Cron Jobs at **once per day** — far too
infrequent to catch an intraday mover within minutes. Vercel Pro removes
that cap but costs $20/mo on top of Finviz Elite's $39.50/mo. Instead,
this uses **Supabase's `pg_cron` + `pg_net`** (already-provisioned
infrastructure, free tier, 1-minute granularity) to call the normal
Vercel serverless function on a schedule — same result, no extra cost,
no third-party scheduler account needed.

## Scheduler (implemented)

Set up directly via the Supabase MCP integration on project
`wcqickazhkxgyofyqnxq`:

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'trading-companion-alerts',
  '*/2 * * * *',
  $$
  select net.http_get(
    url := 'https://trading-companion-ashen.vercel.app/api/check-alerts',
    timeout_milliseconds := 25000
  ) as request_id;
  $$
);
```

Note: `pg_net`'s default timeout is 5000ms, which is too short for
`check-alerts.js` (sequential Finviz fetch + up to 15 Finnhub freshness
checks) — bumped to 25000ms, confirmed no more timeouts.

Verified live: `cron.job_run_details` shows `succeeded` every 2 minutes;
`net._http_response` shows `status_code: 200` with body
`{"ok":true,"checked":15,"alertsSent":0}` (0 because no ticker has hit the
alert conditions yet — the request/response plumbing itself is confirmed
working end to end).

## Architecture

- **`api/check-alerts.js`** — a serverless function that:
  1. Fetches the same Finviz Elite gainers list the Scanner tab uses
     (same filters: price $1-$20, float <20M, relative volume >2x).
  2. For the top 15 candidates by |change%|, checks Finnhub for news
     freshness (bounding API usage — Finnhub free tier is 60 calls/min).
  3. Computes the same 5-Pillars score as `js/scanner.js`'s client-side
     logic (price range, ≥10% gain, ≥5x relative volume, float <20M, news
     ≤24h old).
  4. Fires a Telegram message for any ticker that newly hits 5/5 pillars,
     or newly gets a <2h-fresh news check, that hasn't already alerted
     today.
  5. Dedup state is stored in the **same Supabase `progress` table** the
     rest of the app already uses for calendar/milestones/etc — key
     `telegram-alerts-fired`, value `{date, fired: {"cond:TICKER": true}}`.
     No schema migration needed, no new table.
- **External scheduler** (not yet set up): a free service like
  [cron-job.org](https://cron-job.org) hitting
  `https://trading-companion-ashen.vercel.app/api/check-alerts` every
  1-5 minutes.

## Required env vars

- `TELEGRAM_BOT_TOKEN` — from [@BotFather](https://t.me/BotFather) on Telegram (`/newbot`)
- `TELEGRAM_CHAT_ID` — your own chat ID with the bot (message the bot once,
  then visit `https://api.telegram.org/bot<TOKEN>/getUpdates` to find
  `"chat":{"id":...}`)
- `FINVIZ_API_KEY`, `FINHUB_API_KEY` — already configured, reused here.

## Optional: Discord/Slack webhook (second channel)

Set `DISCORD_WEBHOOK_URL` to also post every alert to a Discord channel
(TradingView's own most common alert path is a generic incoming webhook,
per competitor research). Entirely additive — Telegram remains the only
required channel; if the webhook send fails it's swallowed so it never
breaks the Telegram send. Alert text is converted from Telegram's HTML
to Discord Markdown (`<b>`→`**bold**`, `<a href>`→`[text](url)`) so both
channels carry identical content. A Slack "Incoming Webhook" URL also
works — same `{content: "..."}` JSON body format.

Until `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID` are set, the endpoint
returns `{ok:false, reason:'not configured', missing:{...}}` rather than
partially running.

## Verified so far

- `GET /api/check-alerts` correctly reports which env vars are missing.
- Supabase REST read (`GET .../progress?key=eq.telegram-alerts-fired`) and
  write (`POST .../progress` with `Prefer: resolution=merge-duplicates`)
  both confirmed working against the real anon key/RLS policy (tested
  directly via curl with a throwaway key, then deleted).
- Finviz/Finnhub fetch logic is copied from the already-verified
  `api/scanner-gainers.js` / `api/scanner-news.js`.

**All verified**: real Telegram message received on a real phone
(`preview=1` test mode + a real 5/5-pillar fire), Supabase dedup confirmed
(no repeat alerts on subsequent 2-min runs), and now the scheduler itself
confirmed firing unattended.

## Remaining / optional

- Consider a time-of-day guard (skip running outside ~7am-11am ET, this
  system's real trading window) purely to cut pointless calls the rest of
  the day — not a correctness issue, `alertsSent` is already 0 when
  nothing qualifies. Not implemented; low priority now that everything
  else works.
