# Telegram phone alerts

Status: **implemented, pending Telegram bot credentials + external scheduler.**

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
this uses a **free external scheduler** hitting a normal Vercel serverless
function — same result, no extra Vercel cost.

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

**Not yet verified**: an actual Telegram message being sent and received
on a real phone — needs the real bot token + chat ID.

## Remaining steps

1. User creates a Telegram bot via BotFather, gets the token, messages
   the bot once, retrieves their chat ID.
2. Add both as Vercel env vars (`vercel env add TELEGRAM_BOT_TOKEN` /
   `TELEGRAM_CHAT_ID`), redeploy.
3. Verify: hit `/api/check-alerts` manually, confirm a real Telegram
   message arrives when a qualifying stock exists (may need to wait for
   market hours / a genuine mover, or temporarily lower the pillar bar
   for a one-off test — don't leave test-mode thresholds in committed code).
4. Sign up for a free account at cron-job.org (or similar), add a job
   hitting the endpoint every 1-5 minutes.
5. Consider: should `/api/check-alerts` also skip running entirely
   outside the 7am-11am ET trading window (this system's real trading
   window per the Scanner's own copy) to avoid pointless calls the rest
   of the day? Not implemented yet — worth adding once the happy path is
   confirmed working, as a simple time-of-day guard at the top of the
   handler.
