# Trading Foundations

*Beginner → Intermediate · Futures & Options*

A skill-first curriculum for going from zero to a disciplined, risk-managed
trader — paper account first, TradingView as home base, no shortcuts to an
account size.

**Tags:** 1–3 hrs/day · Futures (ES/NQ) · Options · Crypto (secondary) ·
Paper → Live · Starting capital $1,000

> Updated focus: futures (ES/NQ index futures) is the primary market, with
> the strategy set drawn from Section 10's VWAP/Market Profile educators.
> Options stays in the plan; crypto is kept as an optional, lower-priority
> market rather than the main track.

Originally published as a Claude.ai Artifact ("Trading Foundations") with an
interactive day-by-day calendar and milestone tracker (progress saved via
browser localStorage). This document is the full content, merged into the
repo for durability; see [artifact-embeds] if you want the interactive
version.

---

## 00 — The reality check

This plan deliberately has no dollar target or deadline attached to it.
Here's the data that decided that, and why it changes how the whole
curriculum is built.

| Stat | Meaning |
|---|---|
| **97%** | of individuals day-trading 300+ days lost money (Brazilian futures market study, Chague/De-Losso/Giovannetti 2020) |
| **<1%** | of Taiwanese day traders showed skill that reliably predicted future profit (Barber, Lee, Liu & Odean) |
| **70–97%** | failure rate found consistently across ~30 academic studies in 8 countries |
| **1–4%** | monthly return considered strong-but-plausible for a skilled discretionary retail trader — not 50× a year |

**Why the $50k target got dropped:** Turning $1,000 into $50,000 in a year
is a 50× return. Getting there "on low risk" isn't a strategy problem, it's
a math contradiction: low, controlled risk per trade compounds toward the
1–4%/month range above, not 50×/year. Reaching 50× requires either extreme
leverage, an extreme win-rate/reward combination sustained with zero bad
stretches, or luck — exactly the profile that produces the failure rates
above. This plan optimizes for the thing that actually determines whether
you're still trading (and solvent) in three years: skill, process, and risk
control. Account growth is a byproduct of that, not the target.

Sources: [Chague et al., "Day Trading for a Living?" (SSRN)](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=3423101)
· [Barber, Lee, Liu & Odean, Berkeley/Haas](https://faculty.haas.berkeley.edu/odean/papers/day%20traders/The%20Cross-Section%20of%20Speculator%20Skill.pdf)
· [FINRA Rule 2270, Day-Trading Risk Disclosure](https://www.finra.org/rules-guidance/rulebooks/finra-rules/2270)

---

## 01 — The roadmap

Five phases. You don't advance to the next one by the calendar — you
advance by meeting the exit criteria. Phase 2 (options) only starts once
Phase 1 (futures, paper) is genuinely solid, since options add real
complexity (Greeks, IV, assignment) on top of everything else.

### Phase 0 — Weeks 1–3: Market & platform literacy
*No trading yet.* Before touching a chart with intent to trade it, get
fluent in the vocabulary and the tool.

- Order types (market, limit, stop, stop-limit), bid/ask/spread, order book basics
- Candlestick charts: what OHLC means, timeframes, volume
- Set up TradingView: layouts, watchlists, the built-in Screener, the Paper Trading panel, drawing tools (trendlines, horizontal S/R)
- Learn the four core indicators you'll actually use: moving averages (20/50/200), RSI, volume, and basic support/resistance — resist the urge to load 10 indicators onto one chart
- Start a trading journal (spreadsheet is fine) — you'll use it from day one of Phase 1

**Exit criteria:** You can read a candlestick chart cold, place every order
type on TradingView's paper account without hesitating, and explain
support/resistance and a moving-average crossover in your own words.

### Phase 1 — Weeks 3–10: Futures (ES/NQ), paper account
*One position at a time.* Build real screen-time and pattern recognition
with zero financial risk. This is the longest phase on purpose — it's
where the habits form.

- Trade only two strategies to start: VWAP/trend trading and Market-Profile range trading — see the strategy table below and Section 10's educator picks
- One open paper position at a time; every entry needs a written reason and a stop-loss (in ticks and dollars) before you click buy
- Daily routine: scan → check thesis → execute or wait → journal
- Weekly review: read your own journal, tag every trade as "process followed" or "process broken" independent of P&L
- Target at least 40–60 logged paper trades before moving on — enough for real pattern data, not just a lucky streak

**Exit criteria:** 40+ journaled trades, a positive or breakeven expectancy
on paper over the last 30+ trades, and evidence in the journal that you
follow your stop-loss and position-sizing rules even when it's
uncomfortable.

### Phase 2 — Weeks 10–16: Options, paper account
*thinkorswim paperMoney.* Layer options on once paper trading shows real
discipline. Start with the lowest-complexity, most clearly-defined-risk
strategies only.

- Learn the vocabulary first: strike, expiration, premium, the Greeks (delta, theta, vega) at a conceptual level, implied volatility and IV rank
- Paper-trade covered calls and cash-secured puts before touching spreads
- Move to defined-risk vertical spreads (bull put / bear call) once single-leg strategies feel mechanical
- Learn your broker's options approval tiers — you're aiming to stay at Level 1–2 (defined risk) for a long time, possibly permanently

**Exit criteria:** You can price and explain the risk of a covered call, a
cash-secured put, and a credit spread without looking anything up, and you
have 20+ paper trades across those strategies with your risk rules intact.

### Phase 3 — Month 5 onward: Live account, minimum size
*$1,000 starting capital.* Real money, same rules, smaller size than it
feels like you need. The switch from paper to live is a psychological test
more than a strategy one.

- Start with crypto only, live, using the exact strategies and rules validated in Phase 1
- Risk 1% of account equity per trade maximum (see the risk framework below) — on $1,000 that's $10 per trade, which will feel small; that's correct
- Re-introduce options live only after 4–6 weeks of live crypto discipline, starting with covered calls/cash-secured puts sized to a fraction of the account
- Keep journaling. The live journal is more important than the paper one — this is where you catch emotional decisions

**Exit criteria:** No formal exit — this phase is where you actually become
a trader. Reassess strategy mix and position sizing every month using your
journal data, not your gut.

---

## 02 — The day-by-day calendar

Twelve weeks, five trading days each — 1 hour of learning plus 1 hour of
practice, every day. After week 12, repeat the Week 9–12 rhythm (rotate
strategy focus, keep journaling) until your Phase 1 exit criteria are met —
the calendar is a structure, not a countdown.

### Week 1 — Chart & platform literacy
1. Markets 101 — futures contracts, tick size & tick value, order types (market/limit/stop) · *Practice:* Create your TradingView account, build an "Index Futures" watchlist (ES, NQ, YM, RTY, plus CL and GC)
2. Candlestick anatomy — open/high/low/close, what body & wick tell you · *Practice:* Step through 10 random candles on the ES 1H chart and narrate what each shows
3. Timeframes — how the story changes across 1m/5m/1H/Daily · *Practice:* Open ES on 4 timeframes side by side; note where the trend agrees or disagrees
4. Support & resistance — why price "remembers" levels · *Practice:* Draw horizontal S/R lines on 5 futures charts (ES, NQ, CL, GC, 6E), at least 2 levels each
5. Trend basics — higher highs/lows, moving averages (20/50/200) · *Practice:* Add your MA template; classify ES, NQ, CL, GC, and RTY as uptrend, downtrend, or range

### Week 2 — Tools, alerts & your journal
1. How the Futures Screener works — filter fields, saving presets · *Practice:* Build and save your first futures screener preset (relative volume, ATR, trend filter)
2. Bar Replay — why blind drilling beats reading about patterns · *Practice:* Run 10 blind Bar Replay drills on ES; log your call before revealing each outcome
3. Alerts — price vs. indicator conditions, delivery options · *Practice:* Set 5 price alerts on your futures watchlist so you stop staring at charts
4. What a trading journal needs — the columns that matter, and why research stays separate · *Practice:* Build your journal spreadsheet; write your first research entry (today's context)
5. Review — what from weeks 1-2 still feels shaky? Also: RTH vs. Globex session hours · *Practice:* Full dry run of the daily routine (pre-market → session → post-market) on paper, process only, during regular trading hours

### Week 3 — Strategy 1: VWAP & trend trading
1. VWAP logic — trading with/against VWAP, anchored VWAP (Section 10: Brian Shannon, Anthony Crudele) · *Practice:* Connect Paper Trading; watch ES and NQ a full session, log VWAP relationship without trading
2. Entry rules — the exact checklist for a VWAP reclaim/rejection · *Practice:* First paper trade, using the checklist in full
3. Stop-loss placement — structure-based vs. ATR-based, in ticks and dollars · *Practice:* Second paper trade; write the stop's reasoning (and its $ value) before entry
4. Position sizing math — turning 1-2% risk into a contract count · *Practice:* Third paper trade; show your sizing calculation in the journal
5. Where VWAP trades fail — low-volume, choppy overnight sessions · *Practice:* Review this week's trades; tag each "process followed" or "process broken"

### Week 4 — Reps and risk
1. Multi-timeframe confluence — 5-min vs. daily VWAP · *Practice:* Two more paper trades, noting the higher-timeframe context for each
2. Exit discipline — recognizing when a trend thesis is invalidated · *Practice:* Manage any open position through to a rule-based exit, not a gut-feel one
3. Pattern drill day — engulfing, hammer, doji · *Practice:* 20-minute Bar Replay drill on this set; one more paper trade if a valid setup appears
4. Economic calendar awareness — Fed speakers, CPI/NFP, how they move ES/NQ · *Practice:* Check the calendar before trading; note any high-impact window in your research journal
5. Weekly review methodology — reading your journal for patterns, not just P&L · *Practice:* Full weekly review; tally trades taken so far toward your 40-trade minimum

### Week 5 — VWAP trading toward mastery
1. Position management — scaling out, trailing stops in tick terms · *Practice:* Paper trade using a trailing-stop exit instead of a fixed target
2. Reading volume/delta with trend — confirmation vs. divergence · *Practice:* One more paper trade; note whether volume confirmed the move
3. Chart pattern set — flags, wedges, triangles · *Practice:* 20-minute Bar Replay drill on this set
4. Common psychological traps — revenge trading, FOMO entries · *Practice:* Paper trade; explicitly check for either trap before entering
5. Mid-program self-assessment — are you following your own rules? · *Practice:* Pull your last 15 trades; compute rough win rate and average win/loss size

### Week 6 — Strategy 2: Market Profile & range trading
1. Market Profile logic — value area, balance vs. imbalance (Section 10: Jim Dalton, ShadowTrader) · *Practice:* Identify 3 futures markets currently in balance; dedicated watchlist
2. Confirming reversals at value-area edges · *Practice:* First Market-Profile paper trade, entering only on confirmation
3. Where range trades fail — imbalance breaking out of value · *Practice:* Second trade; predefine the invalidation level
4. Combining Market Profile context with the daily trend · *Practice:* Third trade with higher-timeframe trend noted
5. Review — VWAP-trend vs. Market-Profile-range results so far · *Practice:* Weekly review; update your journal's running expectancy for each strategy

### Week 7 — Range reps + breakout / order flow intro
1. Breakout trading logic — why volume/delta confirmation matters · *Practice:* Screen for a volume-confirmed breakout with your saved preset; paper trade if found
2. False breakouts — the single most common trap in this strategy · *Practice:* Review 5 historical "breakouts" via Bar Replay; classify real vs. false
3. Combining screener + chart read into one 15-minute routine (Section 08) · *Practice:* Run the full 15-minute routine live before your session
4. Risk-of-ruin math, in contract terms — why consecutive losses compound faster than they feel · *Practice:* Paper trade; if two losses hit today, stop per your daily limit
5. Journaling deeper — grading setup quality independent of outcome · *Practice:* Re-grade your last 10 trades on setup quality alone (A/B/C), regardless of P&L

### Week 8 — Consolidation & first expectancy checkpoint
1. What "expectancy" means and how to calculate it · *Practice:* Calculate expectancy across all logged trades so far
2. Reviewing which strategy (trend/range/breakout) fits you best so far · *Practice:* Paper trade using whichever strategy your data currently favors
3. Sizing up responsibly — when, if ever, to increase risk per trade · *Practice:* Paper trade; hold size steady regardless of recent wins
4. Building a personal pre-trade checklist from everything so far · *Practice:* Write your final checklist; use it on today's trade
5. Full system review — this is your Phase 1 exit-criteria checkpoint · *Practice:* Tally total trades, expectancy, and process-adherence rate against Section 01's criteria

### Week 9 — Research routine, deepened
1. Top-down analysis in practice — macro → sector → instrument, worked example · *Practice:* Write a full top-down research note before trading today
2. Reading the economic calendar and CME contract specs/rollover dates together · *Practice:* Check both pre-market; note any high-impact window or front-month rollover to avoid
3. Sentiment tools — COT report positioning, VIX level · *Practice:* Check today's COT/VIX reading; note it in your research journal
4. Sourcing ideas responsibly — TradingView Ideas, vetting a claim before trusting it · *Practice:* Read 2 Ideas posts on a coin you're interested in; write your own agree/disagree
5. Weekly review — is your research journal actually improving your results? · *Practice:* Compare weeks with a written thesis vs. without; note the difference

### Week 10 — Options vocabulary & Phase 2 setup
1. Options vocabulary — strike, expiration, premium · *Practice:* Set up a thinkorswim paperMoney account
2. The Greeks conceptually — delta, theta, vega, what each tells you · *Practice:* Explore an option chain in paperMoney; identify delta/theta for 3 strikes
3. Implied volatility and IV rank — why premium isn't constant · *Practice:* Check IV rank on Barchart for 2 stocks you'd consider trading
4. Covered calls — mechanics and when they make sense · *Practice:* Paper-trade your first covered call in paperMoney
5. Cash-secured puts — mechanics and how they pair with covered calls (the Wheel) · *Practice:* Paper-trade your first cash-secured put

### Week 11 — Options paper trading reps
1. Vertical credit spreads — defined-risk mechanics, why max loss/gain are fixed · *Practice:* Paper-trade your first credit spread using the Section 08 IV-rank recipe
2. Choosing strikes by delta, not by gut feel · *Practice:* Second credit spread, selecting strikes at ~0.20-0.30 delta
3. Managing assignment risk on covered calls / cash-secured puts · *Practice:* Review your open paper positions for assignment risk
4. Broker options approval tiers — what Level 1-2 actually restricts you to · *Practice:* Check your real broker's tier system so you know what you'll need later
5. Weekly review — options paper trades vs. futures paper trades, side by side · *Practice:* Journal review across both books

### Week 12 — System review & live-readiness
1. Iron condors conceptually — combining two credit spreads (for later, not yet) · *Practice:* Paper-trade one iron condor if comfortable; otherwise another single spread
2. Revisiting the risk framework (Section 11) against real numbers from your journal · *Practice:* Recalculate your 1-2% risk unit for a live $1,000 account
3. What changes psychologically between paper and live — and how to plan for it · *Practice:* Write a short "live trading rules" page for yourself, referencing your journal data
4. Final gap-check — reread Section 01's Phase 1 & 2 exit criteria line by line · *Practice:* Honestly mark which criteria are met, which aren't yet
5. Plan your first live week — instrument, strategy, size, routine · *Practice:* If criteria are met, place your first live trade per Phase 3; if not, extend this rhythm

---

## 03 — Strategies worth learning

Boring and repeatable beats exciting and unrepeatable. These are the
strategies with the clearest logic and best risk-defined structure for each
market.

### Futures (ES/NQ) — primary market
| Strategy | Core logic | Timeframe | Risk |
|---|---|---|---|
| VWAP / anchored VWAP trend | Trade with the trend while price holds one side of VWAP; anchor to a session open or catalyst for swing context (Section 10: Shannon, Crudele) | 1m–1H | Medium |
| Market Profile / range | Trade off value-area edges in a balanced (non-trending) session; fade extension back toward value (Section 10: Dalton, ShadowTrader) | 5m–1H | Medium |
| Breakout (volume-confirmed) | Enter only on high-volume/delta breaks of key levels or the opening range; ignore low-volume "breakouts," the most common false-signal trap | 1m–1H | Medium |
| Order flow / tape reading | Read the DOM directly — absorption, delta — for confirmation on top of VWAP/Profile setups (Section 10: futurestrader71, Axia Futures); steeper curve, add after Phase 1 | Tick–1m | Medium–High |

### Crypto — optional, secondary market
| Strategy | Core logic | Timeframe | Risk |
|---|---|---|---|
| Trend following | Trade in the direction of price relative to 50/200 MA; exit on clear reversal signal | 4H–Daily | Medium |
| Range / support-resistance | Buy near established support, sell near resistance in sideways markets; confirm with candlestick reversal patterns | 4H–Daily | Medium |
| DCA with tactical tilts | Fixed periodic buys, modestly increased on deep pullbacks; lowest-effort way to keep a toe in crypto | Weekly+ | Low |

### Options (in learning order)
| Strategy | Core logic | Capital needed | Risk |
|---|---|---|---|
| Covered call | Own 100 shares, sell a call against them for income; upside capped, downside = owning the stock | ~$1,500–5,000+ | Defined |
| Cash-secured put | Sell a put, hold cash to cover assignment; effectively "get paid to name your buy price" | Strike × 100 in cash | Defined |
| Vertical credit spread | Sell one option, buy a further one for protection; max loss and max gain both fixed at entry | A few hundred $ | Defined |
| Iron condor | Two credit spreads combined for a range-bound / neutral bet; more moving parts to manage | A few hundred $ | Defined, complex |
| Naked selling, 0DTE, calendars | Undefined or gamma-heavy risk; reserved for well after this plan, if ever | High account minimums | Undefined / high |

---

## 04 — The toolkit

TradingView is home base for charting and scanning in both markets.
Everything else here fills a specific gap it doesn't cover — kept to a
short list on purpose, since juggling ten tools is its own way to lose
focus.

- **TradingView** *(charting · free)* — Charting, the built-in crypto Screener, Paper Trading (live exchange data), and the Economic Calendar. Your single main workspace for both markets.
- **CoinGecko / CoinMarketCap** *(crypto screening · free)* — Cross-check TradingView's data, filter by volume/market cap/trending — useful for catching moves before they're on your main watchlist.
- **CoinMarketCal** *(crypto calendar · free)* — Token unlocks, exchange listings, upgrades — the crypto-specific "why did this move" context TradingView's calendar doesn't cover.
- **thinkorswim paperMoney** *(options paper trading · free)* — Best-in-class free options paper trading: real option chains, live Greeks and IV, unlimited resets. This is where Phase 2 happens.
- **Barchart IV Rank + OptionVisualizer** *(options screening · free/paid tiers)* — Find high-IV-rank candidates for credit spreads (Barchart) and screen spread/covered-call setups across 80+ filters (OptionVisualizer, free).
- **A spreadsheet** *(journal · free)* — Date, instrument, strategy tag, entry/exit/stop, size, reason for entry, reason for exit, P&L, and a "process followed y/n" column. The single highest-leverage tool on this list.

---

## 05 — Setting up & using TradingView

Everything below works on the free plan. Upgrade only once alert or
multi-chart limits genuinely slow you down — free gives 2 indicators/chart,
1 chart per tab, and 3 price alerts, which is enough for the first few
months.

1. **Build two watchlists** — Watchlist icon (right sidebar) → "+" → search symbols. Make one "Crypto Majors" (BTC, ETH, top 10-15 by market cap) and one "Stocks/Options Underlyings" once you reach Phase 2. Use "Add section" to group majors vs. altcoins.
2. **Save a layout per market** — Set up your chart (timeframe, indicators, colors), then Layout menu → Save As — name it "Crypto Daily" or "Stock Swing." Switch between them instead of rebuilding charts from scratch.
3. **Configure the Screener** — Products → Screeners → Crypto Coins Screener (or Stock Screener). Add filters with the "+" button or Shift+F. Build the recipes from Section 08, then save your own configuration for one-click reuse tomorrow.
4. **Add your four core indicators** — Indicators button (top toolbar) → search & add Moving Average (20, 50, 200), RSI, Volume. Then Indicator Templates menu → "Save Indicator Template As…" and set as default so every new chart loads them automatically.
5. **Learn three drawing tools** — Left toolbar: Trend Line, Horizontal Ray (for support/resistance), and Fibonacci Retracement. Resist adding more tools until these three are automatic.
6. **Set alerts, not a refreshed tab** — Alarm-clock icon or Alt+A → set a price-cross or indicator condition → choose delivery (app push is the useful one). Let the alert watch the chart so you're not staring at it all day.
7. **Drill with Bar Replay** — Click "Bar Replay" on the chart toolbar, click a historical point to set the start, then step forward bar-by-bar with the Forward button. This is your pattern-recognition training tool — see Section 07.
8. **Connect Paper Trading** — Open the Trading Panel below the chart → select "Paper Trading" → Connect. Works for crypto and stocks on the free plan (options themselves aren't tradable here — use thinkorswim paperMoney for those).

Pine Script (TradingView's scripting language for custom indicators/strategies)
isn't worth learning yet — revisit once you want to automate a specific
rule you keep applying by hand.

---

## 06 — How to do market research

The habit that separates a trader from someone clicking buttons: know the
context before you look at a single chart.

1. **Go top-down, every time** — Macro first (rate expectations, major data releases) → sector/market condition (is crypto broadly risk-on? are indices trending?) → only then the specific instrument's chart. Trading a coin or stock in isolation from that context is how "good setups" fail for no visible reason.
2. **Check the calendar before you check the chart** — Economic calendar (CPI, NFP, FOMC) for stocks/options; CoinMarketCal for crypto (unlocks, listings, upgrades). Flag high-impact windows and avoid opening new positions right before them — volatility spikes are when clean setups turn messy.
3. **Use sentiment as context, never as a signal on its own** — Crypto Fear & Greed Index (CoinMarketCap) for extreme-reading contrarian context; COT reports and put/call ratio for futures/options. These tell you what the crowd is doing — layer that under your price-action read, don't trade off it alone.
4. **Source ideas from places that show their work** — TradingView's "Ideas" community and public script library, books (*Street Smarts*, *Mind Over Markets*), structured free courses (Option Alpha, projectfinance). Avoid anywhere the "idea" is just a buy/sell call with no reasoning attached.
5. **Keep a research journal, separate from your trade journal** — Before you trade: write the thesis, the catalyst, the invalidation level. After: your trade journal records what you actually did. Comparing the two over time is how you find out whether your research process itself is any good, independent of individual trade outcomes.

---

## 07 — Training pattern recognition

Reading about a pattern once doesn't make you able to spot it in three
seconds on a live chart. That's a trained reflex, built the same way
flashcards build vocabulary: repetition with immediate feedback.

**The core drill: blind Bar Replay.** Rewind a chart with Bar Replay to a
random historical point. Look at the setup with no idea what happens next.
Name the pattern out loud, write down what you'd do (enter/skip, where the
stop goes), then step forward and check yourself. 15–20 minutes of this
most days is worth more than an hour of reading pattern definitions.

| Candlestick patterns (memorize first) | Chart patterns (memorize second) |
|---|---|
| Bullish / bearish engulfing | Head & shoulders (+ inverse) |
| Hammer / pin bar | Double top / double bottom |
| Doji | Flags & pennants |
| Morning star / evening star | Rising / falling wedges |
| — | Cup & handle, triangles |

Rule of thumb from deliberate-practice research: you're not "done" until
you can name a pattern from the core list in under 5 seconds with 80%+
accuracy. A spaced-repetition rhythm (test today, retest in 4 days, then
11, then 30 if you got it right; sooner if you missed it) beats cramming
all ten patterns once and moving on. A screenshot folder of setups you've
actually traded — graded on signal quality, not outcome — is one of the
highest-value habits you can build alongside the drills.

---

## 08 — Finding trade candidates: screening recipes

Concrete filter settings, not "look for strong stocks." Start from these,
save them as a preset, and adjust once you have enough journal data to know
what actually works for you.

**Futures (ES/NQ) — primary market**
- Relative volume ≥ 1.5× the 20-day average for the session so far
- VWAP position — trend entries: price holding one side of session VWAP; range entries: price at a value-area edge, back toward VWAP
- Volatility filter — compare today's range to the 14-day ATR; a range already >1.5× ATR by mid-morning argues for caution, not chasing
- Session — Regular Trading Hours (RTH) only while learning; Globex/overnight moves are thinner and choppier
- *Note: no single "correct" numeric recipe is as well-documented for futures as the crypto/stock ones below — treat these as a starting heuristic to refine with your own journal data, not a cited rule.*

**Crypto — TradingView Crypto Screener (secondary market)**
- 24h volume > $50M (liquidity floor; large-cap-only variant uses >$1B)
- Market cap — mid/large-cap only, roughly > $300–500M
- 24h change — +5% to +20% for momentum; near 0% + tight range for range setups
- Relative volume ≥ 2× the 10-period average
- Trend filter — price above both 20 EMA and 50 EMA
- *TradingView columns to add: Volume 24h, Change %, Market Cap, Technical Rating (set to Buy/Strong Buy).*

**Stocks — TradingView Stock Screener**
- % change > 4% vs. prior close (the Stockbee "4% breakout" trigger)
- Volume greater than the prior candle's volume; avg daily volume ≥ 500K–1M shares
- Close location within 30% of the day's high (rejects fade-outs)
- Price floor $5–$100 (screens out penny-stock noise)
- Trend filter — above 50-day SMA; for continuation, 50-day SMA above 200-day SMA, RSI(14) 50–70

**Options — Barchart Options Screener**
- Liquidity — open interest ≥ 100, volume ≥ 500
- Moneyness — strikes 5–25% OTM
- IV 30–100%, IV Rank ≥ 30–50%
- Delta (short leg) ≤ ~0.30 for lower assignment risk
- Underlying market cap ≥ $3B
- DTE (credit spreads) 30–45 days to expiration

**The 15-minute daily routine (one market at a time):** Load your saved
screener preset (2 min) → sort by relative volume, skim the top 15–20 rows
for names above their key MA (3 min) → cross off anything failing the
liquidity floor, no exceptions (2 min) → pull up 4–6 survivors on the
chart, check trend and proximity to a clean level (5–6 min) → shortlist 2–3
into a watchlist and log the settings used today (2 min).

---

## 09 — Where to learn it

Use these for concept explainers, not signals. Vet everything: cross-check
any specific claim, and treat a pivot toward paid Discords, "VIP calls," or
leveraged-perps promotion as a reason to stop watching, not a reason to
subscribe.

- **Coin Bureau** *(crypto, research-first)* — Broad, neutral crypto education and project research rather than trade calls.
- **Rekt Capital** *(crypto, TA)* — Chart patterns, halving-cycle structure, published reasoning via a companion newsletter.
- **Benjamin Cowen** *(crypto, data-driven)* — On-chain and macro metrics with a cautious, methodical, non-hype tone.
- **Option Alpha** *(options, free curriculum)* — Structured beginner-to-advanced course content on probability-based options selling.
- **projectfinance (Chris Butler)** *(options, mechanics)* — Clear, visual "how options actually price and move" explainers, no course upsell.
- **tastylive** *(options, institutional)* — Daily programming built by former ThinkorSwim founder Tom Sosnoff, heavy on small sizing and defined risk.
- **Real P&L (Karl Domm)** *(options, verified track record)* — Shows actual monthly statements including losses — the credibility pattern to look for elsewhere too.

---

## 10 — Advanced track: futures & stock day trading

A deeper bench of professional and semi-pro educators, organized by the
actual method they teach rather than by name. Most of this content is
stocks/futures-native, but the underlying methods — VWAP, order flow,
momentum scanning, auction theory — transfer directly to crypto once you're
through Phase 1. Treat this as a reference shelf to pull from once the core
plan feels mechanical, not as a parallel curriculum to start immediately.

Credibility grading: **high** = verifiable track record or institutional
pedigree · **moderate** = real content behind a commercial funnel, worth
normal skepticism · **unverified/low** = treat with real caution or skip.

### VWAP & anchored VWAP
*Using volume-weighted average price, often anchored to a specific event,
as the line that separates control by buyers from control by sellers.*

- **Brian Shannon — AlphaTrends** *(high)* — Popularized Anchored VWAP: anchor to a swing high/low or catalyst, trade with the trend while price holds above (or below) it. ▶ ["The AVWAP Setup Every Swing Trader Should Master"](https://www.youtube.com/watch?v=J_pYTy94thc)
- **Anthony Crudele** *(high)* — Ex-S&P pit trader; combines anchored VWAP with standard-deviation bands and cumulative delta on index futures. ▶ ["Trading from Zero: Blueprint for Beginners"](https://anthonycrudele.com/show/edge126/)
- **vwaptrader1 (JJ)** *(moderate)* — Combines VWAP with Market Profile value areas on ES/NQ futures; notably shows losing trades, not just wins. ▶ ["Beginners Market Profile Class"](https://www.youtube.com/watch?v=xOeQoVxkEE0)
- **Tom Dante** *(moderate)* — Multi-market VWAP day trading; long track record and press mentions, but content sits behind a paid mentorship funnel. ▶ ["Number One VWAP Day Trading Strategy"](https://www.youtube.com/watch?v=CiVjVAlqzPM)
- **Verniman** *(unverified)* — ES futures VWAP + volume profile + market internals ($TICK, $ADSPD) during set intraday windows — small personal blog/community following, no flagship channel to verify against.

### Market profile & auction market theory
*Treating the market as a two-way price-discovery auction: value areas,
balance vs. imbalance, and where price is likely to migrate next.*

- **Jim Dalton** *(high)* — Former CBOT floor trader, co-author of *Mind Over Markets* — foundational to the entire Market Profile framework. ▶ ["The Godfather of Market Profile" (True Trading Alchemy)](https://www.youtube.com/watch?v=yNaLtSHi9AI)
- **ShadowTrader (Peter Reznicek)** *(high)* — ~20 years trading; applies Dalton's Market Profile framework across stocks, options, and forex with day-specific narrative/context. ▶ ["Volume Profile is Like a Weaker Version of Market Profile"](https://www.youtube.com/watch?v=DGGqk9ElBgk)
- **futexlive** *(moderate)* — ~20-year UK futures floor-training operation teaching market profile and DOM/price-ladder reading; institutional feel, paid courses.
- **PharmD_KS** *(moderate)* — Self-taught since 1990; supply/demand-at-price, volume profile, and balance-range analysis on ES/SPX for well-defined-risk setups.

### Order flow & tape reading
*Reading the DOM/order book directly — absorption, delta, resting size —
instead of lagging chart indicators. Steeper learning curve, best attempted
after Phase 2.*

- **futurestrader71 (Morad Askar)** *(high)* — 18+ years trading, founder of a futures brokerage and the Convergent Trading community; reads absorption and acceptance/rejection via Bookmap, waits selectively for high-conviction setups. ▶ ["Stalking Trades Using Order Flow"](https://convergenttrading.com/stalking-order-flow-bookmap-futurestrader71-09-25-19/)
- **Axia Futures** *(moderate)* — FCA-registered UK firm teaching order-flow/tape reading via the price ladder — absorption, spoofing/layering, delta sweeps. Legitimate entity, but a commercial paid curriculum. ▶ [Axia Training Programmes playlist](https://www.youtube.com/playlist?list=PLXmsdXAkBS4pMppnJSC-7xXXerHa8p6As)
- **John Grady — No BS Day Trading** *(moderate)* — Order-flow scalping via footprint charts and DOM; partnered with Jigsaw Trading, a respected order-flow tool vendor. ▶ ["Order Flow Scalping w/ John Grady"](https://www.youtube.com/watch?v=viBGTEGFF1k)
- **FatCat** *(unverified)* — ES futures scalper combining volume profile, order flow, and a structured pre-market routine; niche community channel, limited independent verification.

### Momentum & breakout swing trading (stocks)
*Screening for stocks already in motion and riding the continuation — the
family of methods that maps most directly onto crypto's momentum-driven
price action.*

- **Qullamaggie (Kristjan Kullamägi)** *(high)* — Fully free, no signal-selling. Three core setups — breakouts, episodic pivots, parabolic shorts — traded with 10/20 EMA trailing stops. Probably the single best free resource in this whole list. ▶ ["Swing Trading School" playlist](https://www.youtube.com/playlist?list=PLVsMpuYGSF__PDRsPDKoez4HdSkgA4YSK)
- **Stockbee (Pradeep Bonde)** *(moderate)* — The "4% rule": screen for stocks making a 4%+ single-day move on volume as an early signal of a larger momentum run. Long-running, systematic, and scan-driven — good for teaching quantifiable rules; some track-record claims are self-reported.
- **Lance Breitstein — SMB Capital** *(high)* — Prop trader; trend + momentum on volatile, catalyst-driven names, sized up only when intraday and daily trends align. ▶ ["The Simple Trading Setup That Made Lance Breitstein Millions"](https://www.youtube.com/watch?v=R215f4fj7V8)
- **Steven Spencer — SMB Capital co-founder** *(high)* — Trading since 1996; focuses on intraday momentum around the market open, favoring same-day exits. ▶ ["Trading the Open with Steve Spencer"](https://www.youtube.com/watch?v=fZSd7c7mOGo)

### Options & volatility strategies
- **John Carter — Simpler Trading** *(moderate)* — Creator of the TTM Squeeze (Bollinger Bands inside Keltner Channels) for spotting volatility compression before a breakout. Established but heavily commercialized, with recurring complaints about upsells — learn the concept, be wary of the subscriptions. ▶ ["This Free Indicator Changed My Life"](https://www.youtube.com/watch?v=CiKpny6QiQI)
- **Pete Stolcers — OneOption** *(moderate)* — Former CBOE floor trader; teaches price action first, then options spreads/premium-selling structures for income — solid pedigree, smaller public footprint.

### Sentiment, contrarian & classic pattern trading
- **Jason Shapiro — Crowded Market Report** *(high)* — Featured in Schwager's *Unknown Market Wizards*. Uses the CFTC Commitments of Traders report to fade crowded, one-sided positioning — systematic contrarian trading, not chart patterns. ▶ [Crowded Market Report channel](https://www.youtube.com/@crowdedmarketreport)
- **Linda Raschke** *(high)* — Trading since the 1980s, profiled in *The New Market Wizards*, co-author of *Street Smarts*. Classic short-term patterns: Turtle Soup (false breakout fade), Holy Grail (pullback-in-trend), 80-20 mean reversion. ▶ ["Mean Reversion, Trend Trading, and Breakouts"](https://www.youtube.com/watch?v=6w_omeCRtL0)
- **Merritt Black — SMB Capital** *(high)* — Futures trader using volume profile and mean reversion — fading extension away from high-volume value areas. ▶ ["Merritt Black's Mean Reversion Strategy Explained"](https://www.youtube.com/watch?v=7_LjS1rA89U)

### Lower-confidence / verify before trusting
Real content exists for each of these, but something about the evidence
trail is thin — a paywall hiding the actual method, an unverifiable track
record, or a name that doesn't resolve to a single clear channel. Worth a
look, not worth building a phase of the plan around.

- **Trader Tom** *(mixed)* — Futures/forex price-action scalping plus trading-psychology content; organized channel but no verifiable track record found.
- **TheShortBear** *(mixed)* — Stock short-selling and "Agenda Trading" (catalyst-driven swing trades); the actual mechanics sit mostly behind a paid Substack.
- **LeoTheTiger** *(mixed)* — ES/NQ systematic day-trading playbook; thin public detail, no flagship free video found.
- **Craig Percoco — INEVITRADE** *(mixed)* — Beginner-oriented day trading course spanning stocks/crypto; personal-brand course-sales model, no independently verified track record.
- **PAXTrader** *(unverified)* — Could not confirm a single identity behind this handle — searches surface multiple unrelated entities. Skip unless you have the exact channel link.

---

## 11 — Risk framework

This is the part of the plan that actually determines whether you're still
trading in three years. Apply it identically on paper and live — the habit
has to be automatic before real money is involved.

| Rule | What it means | On a $1,000 account |
|---|---|---|
| 1–2% per trade | Max loss on any single position, sized via stop-loss distance × position size | $10–20 max risk per trade |
| Daily loss limit | Stop trading for the day after losing ~2–3× your per-trade risk | Stop at ~$40–60 down |
| Weekly circuit breaker | Stop trading for the week to prevent revenge-trading spirals | Stop at ~$80–100 down |
| One position at a time | No adding a second open trade until the first is closed — forces full attention per decision | 1 open trade, always |

The 1–2% rule and risk-of-ruin math are standard across retail
risk-management education; full-Kelly position sizing is generally
considered too aggressive for real markets — most practitioners who use
Kelly at all use a half- or quarter-Kelly fraction.

---

## 12 — The daily rhythm

**Before the session (~20 min)**
- Check the economic/crypto calendar for anything market-moving today
- Run the TradingView screener with your saved filters (volume, trend, volatility)
- Shortlist 2–3 candidates max — you'll only take one

**During the session (~60–90 min)**
- Confirm setup against your strategy's exact rules — no rules, no trade
- Write the thesis and stop-loss before entry, not after
- Manage the one open position; no adding a second

**After the session (~20 min)**
- Log the trade (or the decision not to trade) in the journal
- Tag it: process followed or process broken
- Once a week: review the last 5–10 entries for patterns, not just outcomes

---

## 13 — Red flags to walk away from

- Scalping / high-frequency day trading as a starting strategy — requires expert-level execution most beginners don't have yet
- Leverage above 2–3× on crypto futures/perps — the single most common cause of blown accounts
- Paid signal groups, "VIP" Discords, or "copy my trades" livestreams — a well-documented scam pattern, fake track records included
- 0DTE options bought purely for the gamma swing — critics (including an NYU Journal of Law & Business analysis) frame this as functionally gambling
- Naked option selling before Phase 3 is long finished, if ever — loss potential is undefined
- "Guaranteed weekly income" claims about options — no legitimate strategy is riskless
- Low-cap "gem" calls on illiquid altcoins — entertainment content, not a repeatable edge

---

## 14 — Automating your daily briefing

You shouldn't have to manually check five sites every morning. Options
below, from least to most effort:

- **Zapier or Make** *(easiest, ~30 min)* — Pre-built RSS → Telegram/email templates. Free tier covers one daily digest from a few feeds (CoinDesk, CoinTelegraph, Yahoo Finance RSS). No hosting required.
- **n8n** *(more feeds, free long-term)* — Community templates exist for exactly this ("Automated crypto news digest to Telegram with RSS feeds and GPT-4"). Self-hosted or free cloud trial; more setup than Zapier but no monthly task cap.
- **Alpha Vantage + Finnhub** *(free API, low volume)* — Alpha Vantage's free NEWS_SENTIMENT endpoint and Finnhub's free news endpoint both work well for a once-a-day pull — plug either into an n8n/Zapier flow instead of raw RSS for cleaner, tagged output.
- **TradingView webhook alerts** *(complement, not a replacement)* — TradingView has no built-in news digest, but its price/indicator alerts can fire a webhook — wire that into a free Telegram bot for instant price-level notifications alongside your news digest.

*(Note from the original artifact: a recurring scheduled task was running in
that Cowork session to deliver a daily brief automatically — that scheduled
task lives in that session/account, not in this repo, and won't run just
because this doc exists here.)*

---

## 15 — Milestone tracker

Check these off as you actually hit them. (In the original interactive
artifact this saved to browser localStorage — reproduced here as a plain
checklist since this repo has no interactivity of its own.)

- [ ] Set up TradingView workspace — layouts, watchlists, screener, paper trading panel, drawing tools configured
- [ ] Can read candlesticks & place all order types — market, limit, stop, stop-limit — without hesitating
- [ ] Trading journal created — spreadsheet with entry/exit/stop/size/reason/process columns
- [ ] 20 futures paper trades logged — VWAP/trend or Market Profile strategy, one position at a time
- [ ] 40+ futures paper trades, expectancy checked — reviewed last 30+ trades for positive/breakeven expectancy
- [ ] Options vocabulary solid — can explain strike, premium, delta, theta, vega, IV rank unprompted
- [ ] 20 options paper trades (covered calls / CSPs / spreads) — thinkorswim paperMoney, risk rules intact
- [ ] Risk framework internalized — can state your 1-2% rule, daily limit, and weekly circuit breaker from memory
- [ ] First live crypto trade placed — $1,000 account, 1% max risk, full journal entry
- [ ] First month of live trading reviewed — monthly journal review completed, sizing reassessed from data

---

**Not financial advice.** This is an educational curriculum, not a
recommendation to buy, sell, or hold any specific asset. Trading crypto and
options carries real risk of loss, including loss of your full principal;
leveraged and options positions can lose more than your initial investment
in some structures. Past strategy performance and the statistics cited
above do not guarantee future results. Only trade with money you can
afford to lose, and consider consulting a licensed financial advisor before
committing live capital.

[artifact-embeds]: https://claude.ai/code/artifact/2a9852fb-bf85-4b51-b8a6-e4ac898376a9
