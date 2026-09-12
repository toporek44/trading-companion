# Trading Companion — standalone app

This is the full, uncompressed source for the standalone Trading Companion app
(the version deployed at trading-companion-maciejs-projects-37634ad3.vercel.app).
It's a single self-contained `index.html` — no build step, no dependencies to
install beyond what's already loaded via CDN `<script>` tags in the file.

## Why you're getting this as a plain file instead of a live push

Working in Cowork/this chat, deploys had to go through a remote Vercel MCP
connector that has two real limitations that don't exist when you deploy from
your own machine:

1. Each deploy call has to include every file's full content as literal text
   in one message, which hits a size ceiling for a file this size (~130KB
   minified) — the workaround was gzip-compressing, base64-encoding, and
   splitting the app into 15 chunk files that get fetched and reassembled by
   the browser at runtime. That's extra moving parts and a real source of the
   "Failed to fetch" / blank-page issues we were chasing.
2. The MCP connector's OAuth token doesn't have read/list scope on your
   Vercel team, so build logs, deployment status, and Vercel Authentication
   (a.k.a. Deployment Protection) settings couldn't be inspected or changed
   from here — you had to go into the Vercel dashboard yourself.

None of that applies when you deploy from Claude Code on your own computer,
because you'll be using your own authenticated `vercel` CLI session instead
of a shared remote connector.

## Set up locally

```bash
# 1. Turn this folder into a git repo (skip if you already have one)
cd trading-companion
git init
git add index.html README.md
git commit -m "Trading Companion — standalone app"

# 2. Push to GitHub (create an empty repo first on github.com, then:)
git remote add origin https://github.com/<your-username>/trading-companion.git
git branch -M main
git push -u origin main

# 3. Deploy straight to Vercel (no GitHub needed if you just want to deploy)
npm install -g vercel   # if you don't have it already
vercel login
vercel --prod
```

`vercel --prod` from inside this folder will deploy `index.html` as a static
site directly — no compression tricks needed, since the CLI doesn't have the
message-size constraint the remote MCP tool had.

## If you connect the GitHub repo to your existing Vercel project

Instead of running `vercel --prod` from the CLI, you can link the GitHub repo
to your existing `trading-companion` Vercel project (Vercel dashboard →
Import Git Repository), and every future `git push` to `main` will
auto-deploy. This also gives you normal Vercel deployment logs in the
dashboard, which the remote MCP connector couldn't read for us in this
session.

## Deployment Protection

If the live URL ever shows Vercel's own login page instead of the app, that's
"Vercel Authentication" under Settings → Deployment Protection on the
project — turn it off there (or scope it to preview deployments only) so the
production URL is public.

## Supabase

The app is wired to Supabase for cross-device sync (project ref
`wcqickazhkxgyofyqnxq`, region eu-central-1) — that connection is unchanged
by how you deploy, since it's just a client-side call from the browser using
the anon key already in the file.

## What's in this build

Everything from the most recent round of work: the Scanner rebuilt to match
Warrior Trading's real scanner layout (rank badges, top-3/top-10 highlight,
`# / Change% / Symbol+News / Price / Volume / Rel Vol / Float / Float
rotation / Pillars` columns), news-freshness icons (🔥 <2h, 🟢 <4h, 🟡 <12h,
🟠 <24h, ⚪ 24h+), catalyst-quality tagging (mergers excluded from counting as
a good catalyst), a real relative-volume calculation, and the redesigned
Trading Plan Worksheet (icon-labeled card sections, fixed the CSS bug that
made wide fields only span half the row).
