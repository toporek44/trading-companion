# Spaced-Repetition Practice System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the disconnected one-shot lesson quizzes and endless candle drill with a single daily spaced-repetition "Practice" system covering candlestick patterns, trading terminology, and strategy/rule questions, scheduled with Leitner boxes and synced via Supabase.

**Architecture:** Three plain-data card decks (candle, glossary, strategy) feed a deck-agnostic Leitner scheduler (`js/srs.js`, pure functions, unit-tested with Node's built-in test runner). A new `js/practice.js` module builds the daily queue, renders one card at a time in the existing app's vanilla-JS/innerHTML style, and persists progress through the app's existing generic `progress` table sync (`persistProgress('srs', ...)`) — no new backend or schema.

**Tech Stack:** Vanilla JS (ES modules), no build step, no new runtime dependencies. Testing: Node's built-in `node --test` + `node:assert/strict` for the pure scheduler logic (no framework to install). UI logic is manually verified in the browser (matches how the rest of this app is tested today — there is no existing JS test suite to extend beyond what this plan adds).

**Spec:** `docs/superpowers/specs/2026-09-12-spaced-repetition-practice-design.md`

## Global Constraints

- No verbatim scraped transcript/blog text anywhere in the codebase — all glossary/strategy card content is original writing.
- No new npm runtime dependencies; `vite` stays the only devDependency plus whatever Node ships built-in (`node:test`, `node:assert`).
- Sync must reuse the existing `progress` table / `persistProgress(key, value)` pattern in `js/state.js` — no new Supabase table or column.
- Leitner boxes 1-6, interval-in-days per box: `[0, 1, 3, 7, 14, 30]` (box 1 = 0 days, box 6 = 30 days).
- New-card introduction cap: 10 unseen cards/day, round-robin across decks.
- `js/lessons.js` and its `LESSONS` export are not modified — the strategy deck is a derived copy of its quiz content, not a replacement.

---

## File Structure

- **New:** `js/srs.js` — pure Leitner scheduling functions (no DOM, no state import).
- **New:** `tests/srs.test.js` — `node:test` unit tests for `js/srs.js`.
- **New:** `js/glossary.js` — glossary term data + `getGlossaryCards()`.
- **New:** `js/strategy-cards.js` — new strategy card data + `getStrategyCards()` (derives cards from `LESSONS` plus new original cards).
- **New:** `js/practice.js` — Practice tab rendering, session/queue state, grading, DOM event wiring.
- **Modify:** `js/candle-drill.js` — keep `CANDLE_PATTERNS` + `renderCandleSVG`, add `getCandleCards()`, remove the standalone drill's stats/loop/DOM-wiring code (moves into `practice.js`).
- **Modify:** `js/state.js` — add `srsState`/`srsLoaded` to `state`, default value, load/save/realtime branches for `progress` key `'srs'`.
- **Modify:** `js/nav.js` — add `'practice'` to `pages` and `titles`.
- **Modify:** `js/app.js` — swap the `candle-drill.js` side-effect import for named imports consumed by `practice.js`; import and call `renderPractice()`; add `state.srsLoaded` to the `renderAll` gate.
- **Modify:** `index.html` — add `page-practice` section + sidebar nav button; remove the old `candle-drill-card` block from `page-lessons`.
- **Modify:** `package.json` — add a `"test": "node --test tests/"` script.

---

### Task 1: Leitner scheduler core (`js/srs.js`)

**Files:**
- Create: `js/srs.js`
- Create: `tests/srs.test.js`
- Modify: `package.json` (add `test` script)

**Interfaces:**
- Produces (used by `js/practice.js` in Task 5):
  - `BOX_INTERVALS: number[]` — `[0, 0, 1, 3, 7, 14, 30]`, indexed by box number (index 0 unused).
  - `todayStr(d?: Date): string` — `'YYYY-MM-DD'`.
  - `addDays(dateStr: string, days: number): string` — `'YYYY-MM-DD'`.
  - `gradeCard(existing: {box:number,dueDate:string,lastSeen:string}|null|undefined, correct: boolean, today: string): {box:number,dueDate:string,lastSeen:string}`.
  - `shuffle<T>(arr: T[], rng?: () => number): T[]` — non-mutating.
  - `buildQueue(cards: {id:string,deck:string}[], records: Record<string,{box:number,dueDate:string}>, today: string, newCardLimit?: number, rng?: () => number): {id:string,deck:string}[]`.
  - `computeStreak(prevStreak: number, lastReviewDate: string|null, today: string): number`.

- [ ] **Step 1: Write the failing tests**

Create `tests/srs.test.js`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, gradeCard, buildQueue, computeStreak, BOX_INTERVALS } from '../js/srs.js';

test('addDays adds calendar days across a month boundary', () => {
  assert.equal(addDays('2026-01-30', 3), '2026-02-02');
});

test('gradeCard promotes box on a correct answer', () => {
  const result = gradeCard({ box: 2, dueDate: '2026-01-01', lastSeen: '2026-01-01' }, true, '2026-01-05');
  assert.equal(result.box, 3);
  assert.equal(result.dueDate, addDays('2026-01-05', BOX_INTERVALS[3]));
  assert.equal(result.lastSeen, '2026-01-05');
});

test('gradeCard resets to box 1 on a wrong answer', () => {
  const result = gradeCard({ box: 5, dueDate: '2026-01-01', lastSeen: '2026-01-01' }, false, '2026-01-05');
  assert.equal(result.box, 1);
  assert.equal(result.dueDate, addDays('2026-01-05', BOX_INTERVALS[1]));
});

test('gradeCard introduces an unseen card at box 1 either way', () => {
  assert.equal(gradeCard(null, true, '2026-01-05').box, 1);
  assert.equal(gradeCard(undefined, false, '2026-01-05').box, 1);
});

test('gradeCard caps box at 6', () => {
  const result = gradeCard({ box: 6, dueDate: '2026-01-01', lastSeen: '2026-01-01' }, true, '2026-01-05');
  assert.equal(result.box, 6);
});

test('buildQueue includes due cards and caps new cards at the limit, round-robin across decks', () => {
  const cards = [
    { id: 'a1', deck: 'a' }, { id: 'a2', deck: 'a' }, { id: 'a3', deck: 'a' },
    { id: 'b1', deck: 'b' }, { id: 'b2', deck: 'b' },
  ];
  const records = { a1: { box: 2, dueDate: '2026-01-01' } };
  const queue = buildQueue(cards, records, '2026-01-05', 3, () => 0.999);
  const ids = queue.map(c => c.id);
  assert.equal(queue.length, 4);
  assert.ok(ids.includes('a1'));
  assert.ok(ids.includes('a2'));
  assert.ok(ids.includes('b1'));
});

test('buildQueue excludes cards not yet due', () => {
  const cards = [{ id: 'a1', deck: 'a' }];
  const records = { a1: { box: 2, dueDate: '2099-01-01' } };
  const queue = buildQueue(cards, records, '2026-01-05', 0, () => 0.5);
  assert.equal(queue.length, 0);
});

test('computeStreak increments on a consecutive day, resets on a gap, holds on the same day', () => {
  assert.equal(computeStreak(5, '2026-01-04', '2026-01-05'), 6);
  assert.equal(computeStreak(5, '2026-01-05', '2026-01-05'), 5);
  assert.equal(computeStreak(5, '2026-01-01', '2026-01-05'), 1);
  assert.equal(computeStreak(0, null, '2026-01-05'), 1);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/`
Expected: FAIL — `Cannot find module '../js/srs.js'` (file doesn't exist yet).

- [ ] **Step 3: Implement `js/srs.js`**

```javascript
// ---------- Leitner spaced-repetition scheduler (pure, no DOM/state) ----------
export const BOX_INTERVALS = [0, 0, 1, 3, 7, 14, 30]; // index = box number, 1-6

export function todayStr(d = new Date()){
  return d.toISOString().slice(0, 10);
}

export function addDays(dateStr, days){
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function gradeCard(existing, correct, today){
  const prevBox = existing ? existing.box : 0;
  const newBox = correct ? Math.min(prevBox + 1, 6) : 1;
  return { box: newBox, dueDate: addDays(today, BOX_INTERVALS[newBox]), lastSeen: today };
}

export function shuffle(arr, rng = Math.random){
  const out = arr.slice();
  for(let i = out.length - 1; i > 0; i--){
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function buildQueue(cards, records, today, newCardLimit = 10, rng = Math.random){
  const due = cards.filter(c => records[c.id] && records[c.id].dueDate <= today);
  const unseen = cards.filter(c => !records[c.id]);
  const byDeck = {};
  unseen.forEach(c => { (byDeck[c.deck] = byDeck[c.deck] || []).push(c); });
  const deckKeys = Object.keys(byDeck);
  const introduced = [];
  let i = 0;
  while(introduced.length < newCardLimit && deckKeys.some(k => byDeck[k].length)){
    const key = deckKeys[i % deckKeys.length];
    if(byDeck[key].length) introduced.push(byDeck[key].shift());
    i++;
  }
  return shuffle(due.concat(introduced), rng);
}

export function computeStreak(prevStreak, lastReviewDate, today){
  if(lastReviewDate === today) return prevStreak;
  if(lastReviewDate === addDays(today, -1)) return prevStreak + 1;
  return 1;
}
```

- [ ] **Step 4: Add the test script and run tests to verify they pass**

Edit `package.json` `scripts` to:

```json
"scripts": {
  "dev": "vite",
  "test": "node --test tests/"
}
```

Run: `npm test`
Expected: PASS — all 8 tests green.

- [ ] **Step 5: Commit**

```bash
git add js/srs.js tests/srs.test.js package.json
git commit -m "$(cat <<'EOF'
Add Leitner spaced-repetition scheduler with unit tests

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012B8wnYDabxGxWcPBBiEWcy
EOF
)"
```

---

### Task 2: Candle deck adapter (`js/candle-drill.js`)

**Files:**
- Modify: `js/candle-drill.js`

**Interfaces:**
- Consumes: nothing new.
- Produces (used by `js/practice.js` in Task 5):
  - `CANDLE_PATTERNS` (already exported, unchanged shape: `{name, cls, type, candles}[]`).
  - `renderCandleSVG(candles)` (already exported, unchanged).
  - `getCandleCards(): {id: string, deck: 'candle', name: string, candles: object[]}[]` — new export, one card per pattern, `id` = `candle:` + a kebab-case slug of `name`.

This task removes the old standalone drill's runtime state and DOM wiring (`loadCandleDrillStats`, `saveCandleDrillStats`, `candleTodayStr`, `pickCandleRound`, `renderCandleDrill`, the module-level `candleDrillStats`/`candleDrillRound`/`candleDrillAnswered` variables, and the `document.getElementById('candle-drill-body').addEventListener(...)` block) — that responsibility moves into `js/practice.js` in Task 5. Do this removal in the same task as adding `getCandleCards()` so the file is never left with two competing quiz UIs.

- [ ] **Step 1: Add `getCandleCards()` and remove the old drill's stats/loop/DOM code**

Replace the entire contents of `js/candle-drill.js` with:

```javascript
// ---------- Candlestick pattern data + shared rendering (used by the Practice deck) ----------
export const CANDLE_PATTERNS = [
  { name: 'Hammer', cls: 'bullish', type: 'single', candles: [{color:'g',bodyTop:15,bodyBottom:30,wickTop:10,wickBottom:95}] },
  { name: 'Inverted Hammer', cls: 'bullish', type: 'single', candles: [{color:'g',bodyTop:68,bodyBottom:83,wickTop:8,wickBottom:85}] },
  { name: 'Dragonfly Doji', cls: 'bullish', type: 'single', candles: [{color:'g',bodyTop:14,bodyBottom:16,wickTop:10,wickBottom:95}] },
  { name: 'Bullish Spinning Top', cls: 'bullish', type: 'single', candles: [{color:'g',bodyTop:40,bodyBottom:58,wickTop:12,wickBottom:88}] },
  { name: 'Bullish Engulfing', cls: 'bullish', type: 'double', candles: [{color:'r',bodyTop:40,bodyBottom:58,wickTop:35,wickBottom:62},{color:'g',bodyTop:22,bodyBottom:72,wickTop:18,wickBottom:76}] },
  { name: 'Tweezer Bottom', cls: 'bullish', type: 'double', candles: [{color:'r',bodyTop:30,bodyBottom:60,wickTop:25,wickBottom:88},{color:'g',bodyTop:32,bodyBottom:58,wickTop:28,wickBottom:88}] },
  { name: 'Morning Doji Star', cls: 'bullish', type: 'triple', candles: [{color:'r',bodyTop:20,bodyBottom:55,wickTop:15,wickBottom:58},{color:'n',bodyTop:68,bodyBottom:71,wickTop:60,wickBottom:80},{color:'g',bodyTop:25,bodyBottom:60,wickTop:20,wickBottom:64}] },
  { name: 'Three White Soldiers', cls: 'bullish', type: 'triple', candles: [{color:'g',bodyTop:70,bodyBottom:90,wickTop:66,wickBottom:92},{color:'g',bodyTop:50,bodyBottom:72,wickTop:46,wickBottom:74},{color:'g',bodyTop:30,bodyBottom:54,wickTop:26,wickBottom:56}] },
  { name: 'Morning Star', cls: 'bullish', type: 'triple', candles: [{color:'r',bodyTop:20,bodyBottom:55,wickTop:15,wickBottom:58},{color:'r',bodyTop:66,bodyBottom:76,wickTop:60,wickBottom:80},{color:'g',bodyTop:25,bodyBottom:60,wickTop:20,wickBottom:64}] },
  { name: 'Rising Three Methods', cls: 'bullish', type: 'triple', candles: [{color:'g',bodyTop:15,bodyBottom:55,wickTop:10,wickBottom:58},{color:'r',bodyTop:35,bodyBottom:45,wickTop:30,wickBottom:50},{color:'g',bodyTop:10,bodyBottom:52,wickTop:6,wickBottom:55}] },
  { name: 'Hanging Man', cls: 'bearish', type: 'single', candles: [{color:'r',bodyTop:15,bodyBottom:30,wickTop:10,wickBottom:95}] },
  { name: 'Shooting Star', cls: 'bearish', type: 'single', candles: [{color:'r',bodyTop:68,bodyBottom:83,wickTop:8,wickBottom:85}] },
  { name: 'Gravestone Doji', cls: 'bearish', type: 'single', candles: [{color:'r',bodyTop:83,bodyBottom:86,wickTop:8,wickBottom:86}] },
  { name: 'Bearish Spinning Top', cls: 'bearish', type: 'single', candles: [{color:'r',bodyTop:40,bodyBottom:58,wickTop:12,wickBottom:88}] },
  { name: 'Bearish Engulfing', cls: 'bearish', type: 'double', candles: [{color:'g',bodyTop:42,bodyBottom:60,wickTop:38,wickBottom:64},{color:'r',bodyTop:20,bodyBottom:70,wickTop:16,wickBottom:74}] },
  { name: 'Tweezer Tops', cls: 'bearish', type: 'double', candles: [{color:'g',bodyTop:32,bodyBottom:60,wickTop:10,wickBottom:64},{color:'r',bodyTop:30,bodyBottom:58,wickTop:10,wickBottom:66}] },
  { name: 'Evening Doji Star', cls: 'bearish', type: 'triple', candles: [{color:'g',bodyTop:45,bodyBottom:80,wickTop:42,wickBottom:84},{color:'n',bodyTop:28,bodyBottom:31,wickTop:20,wickBottom:42},{color:'r',bodyTop:40,bodyBottom:75,wickTop:36,wickBottom:78}] },
  { name: 'Three Black Crows', cls: 'bearish', type: 'triple', candles: [{color:'r',bodyTop:10,bodyBottom:30,wickTop:6,wickBottom:32},{color:'r',bodyTop:28,bodyBottom:50,wickTop:24,wickBottom:52},{color:'r',bodyTop:46,bodyBottom:68,wickTop:42,wickBottom:70}] },
  { name: 'Evening Star', cls: 'bearish', type: 'triple', candles: [{color:'g',bodyTop:45,bodyBottom:80,wickTop:42,wickBottom:84},{color:'g',bodyTop:24,bodyBottom:34,wickTop:20,wickBottom:42},{color:'r',bodyTop:40,bodyBottom:75,wickTop:36,wickBottom:78}] },
  { name: 'Falling Three Methods', cls: 'bearish', type: 'triple', candles: [{color:'r',bodyTop:45,bodyBottom:85,wickTop:40,wickBottom:88},{color:'g',bodyTop:55,bodyBottom:65,wickTop:50,wickBottom:70},{color:'r',bodyTop:48,bodyBottom:90,wickTop:44,wickBottom:92}] },
  { name: 'Doji', cls: 'neutral', type: 'single', candles: [{color:'n',bodyTop:48,bodyBottom:52,wickTop:8,wickBottom:92}] },
];

export function renderCandleSVG(candles){
  const colW = 40, gap = 10;
  const totalW = candles.length * colW + (candles.length - 1) * gap;
  const colorVar = c => c === 'g' ? 'var(--good)' : c === 'r' ? 'var(--bad)' : 'var(--muted)';
  const parts = candles.map((c, i) => {
    const x = i * (colW + gap);
    const cx = x + colW / 2;
    const col = colorVar(c.color);
    const bodyY = Math.min(c.bodyTop, c.bodyBottom);
    const bodyH = Math.max(1, Math.abs(c.bodyBottom - c.bodyTop));
    return `<line x1="${cx}" y1="${c.wickTop}" x2="${cx}" y2="${c.wickBottom}" stroke="${col}" stroke-width="2"/>`
      + `<rect x="${x}" y="${bodyY}" width="${colW}" height="${bodyH}" fill="${col}" stroke="${col}"/>`;
  }).join('');
  return `<svg viewBox="0 0 ${totalW} 100" style="width:100%;max-width:220px;height:160px;display:block;margin:0 auto;">${parts}</svg>`;
}

function slug(name){
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function getCandleCards(){
  return CANDLE_PATTERNS.map(p => ({ id: 'candle:' + slug(p.name), deck: 'candle', name: p.name, candles: p.candles }));
}
```

- [ ] **Step 2: Manually verify the module still loads with no syntax errors**

Run: `node -e "import('./js/candle-drill.js').then(m => console.log(m.getCandleCards().length, m.CANDLE_PATTERNS.length))"`
Expected: prints `21 21`.

- [ ] **Step 3: Commit**

```bash
git add js/candle-drill.js
git commit -m "$(cat <<'EOF'
Turn candle-drill.js into shared candle data + getCandleCards()

Removes the old standalone drill's stats/loop/DOM wiring — that UI
moves into the new unified Practice tab in a later commit.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012B8wnYDabxGxWcPBBiEWcy
EOF
)"
```

*(Note: after this commit and before Task 7, `index.html` still references `#candle-drill-body`/`#candle-drill-card`/`#candle-drill-stats` with no listener attached — those elements just sit inert until Task 7 removes the markup. This is expected mid-plan state, not a bug.)*

---

### Task 3: Glossary deck (`js/glossary.js`)

**Files:**
- Create: `js/glossary.js`

**Interfaces:**
- Produces (used by `js/practice.js` in Task 5):
  - `GLOSSARY_TERMS: {id: string, term: string, definition: string}[]`
  - `getGlossaryCards(): {id: string, deck: 'glossary', term: string, definition: string}[]`

- [ ] **Step 1: Write `js/glossary.js`**

```javascript
// ---------- Trading glossary (original definitions, for the Practice deck) ----------
export const GLOSSARY_TERMS = [
  { id: 'market-order', term: 'Market order', definition: "An order that fills immediately at the best available price — guarantees execution, not price." },
  { id: 'limit-order', term: 'Limit order', definition: 'An order that only fills at a specified price or better — guarantees price, not execution.' },
  { id: 'stop-order', term: 'Stop order (stop-loss)', definition: 'An order that becomes a market order once price reaches a trigger level, used to cap a loss.' },
  { id: 'stop-limit-order', term: 'Stop-limit order', definition: 'A stop order that becomes a limit order (not a market order) once triggered — can fail to fill in a fast-moving market.' },
  { id: 'trailing-stop', term: 'Trailing stop', definition: "A stop order whose trigger price follows the market price by a fixed distance, locking in gains as price moves favorably." },
  { id: 'take-profit-order', term: 'Take-profit order', definition: 'An order that automatically closes a position once a target profit level is reached.' },
  { id: 'bid', term: 'Bid', definition: 'The highest price a buyer is currently willing to pay.' },
  { id: 'ask', term: 'Ask (offer)', definition: 'The lowest price a seller is currently willing to accept.' },
  { id: 'spread', term: 'Spread', definition: 'The gap between the best bid and the best ask.' },
  { id: 'slippage', term: 'Slippage', definition: 'The difference between the expected fill price and the actual fill price, usually from fast-moving or thin markets.' },
  { id: 'vwap', term: 'VWAP', definition: "Volume-Weighted Average Price — a running average price weighted by volume, reset each session; many intraday traders treat it as fair value." },
  { id: 'macd', term: 'MACD', definition: 'Moving Average Convergence Divergence — a momentum indicator built from the difference between two EMAs, plus a signal line.' },
  { id: 'rsi', term: 'RSI', definition: 'Relative Strength Index — a 0-100 momentum oscillator flagging overbought (above 70) and oversold (below 30) conditions.' },
  { id: 'ema', term: 'EMA', definition: 'Exponential Moving Average — weights recent prices more heavily than older ones, reacting faster than a simple average.' },
  { id: 'sma', term: 'SMA', definition: 'Simple Moving Average — the average price over a fixed lookback, with equal weight given to each period.' },
  { id: 'relative-volume', term: 'Relative volume', definition: "Today's volume compared to the average volume for the same time of day — a measure of unusual trading interest." },
  { id: 'float', term: 'Float', definition: "The shares of a company actually available for public trading, excluding closely-held or insider shares." },
  { id: 'market-cap', term: 'Market cap', definition: "A company's total share value — price per share multiplied by shares outstanding." },
  { id: 'support', term: 'Support', definition: 'A price level where buying pressure has historically stepped in, slowing or reversing a decline.' },
  { id: 'resistance', term: 'Resistance', definition: 'A price level where selling pressure has historically capped an advance.' },
  { id: 'level-2', term: 'Level 2', definition: "The order book display — every bid and ask by size, not just the single best price." },
  { id: 'time-and-sales', term: 'Time and Sales', definition: 'The scrolling log of trades that actually executed (the "tape") — price, size, and whether it hit the bid or ask.' },
  { id: 'tape-reading', term: 'Tape reading', definition: 'Interpreting Level 2 and Time and Sales together to gauge real-time buying and selling pressure.' },
  { id: 'candlestick', term: 'Candlestick', definition: "A chart element showing a period's open, high, low, and close — a body for the open-close range and wicks for the high/low extremes." },
  { id: 'wick', term: 'Wick (shadow)', definition: "The thin line above or below a candle's body, marking a high or low that was reached but not held at close." },
  { id: 'gap', term: 'Gap', definition: "A price jump between one period's close and the next period's open, leaving a visible break on the chart." },
  { id: 'volume', term: 'Volume', definition: 'The number of shares or contracts traded in a period — a measure of participation behind a price move.' },
  { id: 'atr', term: 'ATR', definition: 'Average True Range — the average size of a price move per period, often used to size stop distances by volatility.' },
  { id: 'ma-crossover', term: 'Moving average crossover', definition: 'A signal generated when a faster moving average crosses above or below a slower one.' },
  { id: 'divergence', term: 'Divergence', definition: "When price makes a new high or low but an indicator like RSI or MACD doesn't confirm it — often flagged as a weakening trend." },
  { id: 'consolidation', term: 'Consolidation', definition: 'A period where price trades in a tight range instead of trending, often just before a breakout.' },
  { id: 'breakout', term: 'Breakout', definition: 'Price moving decisively beyond a defined support or resistance level, often on higher volume.' },
  { id: 'pullback', term: 'Pullback', definition: 'A brief, shallow retracement against the prevailing trend before it resumes.' },
  { id: 'reversal', term: 'Reversal', definition: "A change in the direction of a security's prevailing price trend." },
  { id: 'trend-line', term: 'Trend line', definition: 'A line drawn connecting a series of highs or lows to visualize the direction and slope of a trend.' },
  { id: 'r-multiple', term: 'R-multiple', definition: "A trade's profit or loss expressed as a multiple of the dollar amount risked (risking $50 to make $150 is +3R)." },
  { id: 'drawdown', term: 'Drawdown', definition: "The decline from an account's peak value to a subsequent trough, usually shown as a percentage." },
  { id: 'expectancy', term: 'Expectancy', definition: 'The average amount a trader expects to win or lose per trade, combining win rate with average win/loss size.' },
  { id: 'position-sizing', term: 'Position sizing', definition: 'Deciding how many shares, contracts, or units to trade based on account risk tolerance, not just conviction.' },
  { id: 'risk-of-ruin', term: 'Risk of ruin', definition: 'The probability that a strategy, over enough trades, empties the account given its risk-per-trade and edge.' },
  { id: 'win-rate', term: 'Win rate', definition: 'The percentage of trades that close profitably.' },
  { id: 'reward-to-risk', term: 'Reward-to-risk ratio', definition: "A trade's potential profit compared to its potential loss, set before entry." },
  { id: 'max-daily-loss', term: 'Max daily loss', definition: 'A predetermined dollar or percentage loss limit that ends a trading session for the day once hit.' },
  { id: 'circuit-breaker', term: 'Personal circuit breaker', definition: 'A self-imposed rule (like stopping after N consecutive losers) that halts trading to prevent emotional revenge-trading.' },
  { id: 'account-equity', term: 'Account equity', definition: "The current total value of a trading account, including any open position's unrealized P&L." },
  { id: 'leverage', term: 'Leverage', definition: 'Trading with borrowed capital so a given dollar move produces a larger percentage gain or loss on the trader\'s own capital.' },
  { id: 'margin-call', term: 'Margin call', definition: "A broker's demand for additional funds when an account's equity falls below the required maintenance level." },
  { id: 'call-option', term: 'Call option', definition: 'A contract giving the right, but not the obligation, to buy an underlying asset at a set strike price by expiration.' },
  { id: 'put-option', term: 'Put option', definition: 'A contract giving the right, but not the obligation, to sell an underlying asset at a set strike price by expiration.' },
  { id: 'strike-price', term: 'Strike price', definition: 'The fixed price at which an option holder can buy (call) or sell (put) the underlying asset.' },
  { id: 'premium', term: 'Premium', definition: 'The price paid to buy an options contract.' },
  { id: 'expiration-date', term: 'Expiration date', definition: 'The date an options contract stops trading and is settled or expires worthless.' },
  { id: 'itm', term: 'In the money', definition: 'An option that would have intrinsic value if exercised right now (a call with strike below market, or a put with strike above market).' },
  { id: 'otm', term: 'Out of the money', definition: 'An option with no intrinsic value right now — it would expire worthless if it expired today.' },
  { id: 'implied-volatility', term: 'Implied volatility', definition: "The market's forecast of a security's future volatility, embedded in an option's price." },
  { id: 'theta-decay', term: 'Theta decay', definition: "The loss of an option's value over time as expiration approaches, all else equal." },
  { id: 'delta', term: 'Delta', definition: "How much an option's price is expected to move per $1 move in the underlying asset." },
  { id: 'assignment', term: 'Assignment', definition: 'Being obligated to fulfill an option contract\'s terms (buying or selling the underlying) when it is exercised against you.' },
  { id: 'open-interest', term: 'Open interest', definition: 'The total number of outstanding options contracts of a given strike and expiration that have not been closed or exercised.' },
  { id: 'spot-market', term: 'Spot market', definition: 'Buying or selling an asset for immediate delivery and ownership, as opposed to a derivative contract.' },
  { id: 'perpetual-futures', term: 'Perpetual futures', definition: 'A futures-like crypto contract with no expiration date, kept near the spot price via periodic funding payments.' },
  { id: 'funding-rate', term: 'Funding rate', definition: 'A periodic payment between long and short holders of a perpetual futures contract that keeps its price anchored to spot.' },
  { id: 'liquidation', term: 'Liquidation', definition: "The forced closure of a leveraged position by the exchange when losses erode the trader's margin below a maintenance threshold." },
  { id: 'order-book', term: 'Order book', definition: 'The live list of all open buy and sell orders for an asset, organized by price.' },
  { id: 'market-maker', term: 'Market maker', definition: 'A trader or firm that continuously posts both buy and sell orders to provide liquidity, profiting from the spread.' },
  { id: 'self-custody', term: 'Self-custody', definition: "Holding crypto in a personal wallet you control, as opposed to leaving it on an exchange (custodial risk)." },
];

export function getGlossaryCards(){
  return GLOSSARY_TERMS.map(t => ({ id: 'glossary:' + t.id, deck: 'glossary', term: t.term, definition: t.definition }));
}
```

- [ ] **Step 2: Verify it loads and has no duplicate ids**

Run: `node -e "import('./js/glossary.js').then(m => { const ids = m.getGlossaryCards().map(c => c.id); console.log(ids.length, new Set(ids).size); })"`
Expected: two equal numbers printed (e.g. `65 65`) — confirms no duplicate ids.

- [ ] **Step 3: Commit**

```bash
git add js/glossary.js
git commit -m "$(cat <<'EOF'
Add trading glossary deck for spaced-repetition practice

Original definitions covering order types, chart/indicator terms,
risk terms, and options/crypto vocabulary.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012B8wnYDabxGxWcPBBiEWcy
EOF
)"
```

---

### Task 4: Strategy deck (`js/strategy-cards.js`)

**Files:**
- Create: `js/strategy-cards.js`

**Interfaces:**
- Consumes: `LESSONS` from `js/lessons.js` (existing export, shape `{id, title, body, quiz: {q, options, correct, explain}[]}[]`).
- Produces (used by `js/practice.js` in Task 5):
  - `NEW_STRATEGY_CARDS: {id: string, q: string, options: string[], correct: number, explain: string}[]`
  - `getStrategyCards(): {id: string, deck: 'strategy', q: string, options: string[], correct: number, explain: string}[]` — one card per `LESSONS[].quiz[]` entry (id `strategy:<lessonId>:<index>`) plus every entry in `NEW_STRATEGY_CARDS`.

- [ ] **Step 1: Write `js/strategy-cards.js`**

```javascript
import { LESSONS } from './lessons.js';

// ---------- New original strategy cards (fill gaps the lesson quizzes don't cover) ----------
export const NEW_STRATEGY_CARDS = [
  { id: 'strategy:new:stop-placement', q: "Where should a stop-loss typically sit relative to the pattern you're trading?", options: ["At a level that, if hit, proves the setup's premise wrong (e.g. below the pullback low)", 'A fixed 10% below entry no matter the setup', "There is no need for a fixed stop if you're watching the trade closely", 'At the exact entry price'], correct: 0, explain: "A stop belongs at the level that invalidates the reason you took the trade — not an arbitrary distance." },
  { id: 'strategy:new:position-sizing', q: 'You have a $10,000 account and want to risk 1% per trade. Your stop is $0.50 away from entry. Roughly how many shares should you buy?', options: ['20 shares', '200 shares', '2,000 shares', '20,000 shares'], correct: 1, explain: '1% of $10,000 = $100 risk. $100 / $0.50 stop distance = 200 shares.' },
  { id: 'strategy:new:scaling-out', q: "What does 'scaling out' of a position mean?", options: ['Selling the entire position at once at a single price', 'Selling a portion of the position at one target and letting the rest ride toward a further target', 'Adding to a losing position to lower the average cost', 'Exiting only at a stop-loss'], correct: 1, explain: 'Scaling out locks in partial profit while leaving room for the trade to keep working.' },
  { id: 'strategy:new:averaging-down', q: "Why is 'averaging down' (buying more as a losing trade drops further) considered risky?", options: ["It isn't risky — it lowers your average cost", "It adds size to a trade that's already proving the original thesis wrong, growing the loss if the decline continues", "It's only risky in options", 'It guarantees a better exit price'], correct: 1, explain: 'Adding to a loser compounds risk in a trade that price action is already arguing against.' },
  { id: 'strategy:new:premarket-prep', q: 'What is the main purpose of premarket preparation (scanning, plan review) before the session opens?', options: ["It's optional busywork", 'To walk in with a plan and watchlist decided calmly, before live P&L and emotion are in play', 'To guarantee a winning trade', 'It only matters for options traders'], correct: 1, explain: 'Decisions made calmly beforehand hold up better than decisions made live under pressure.' },
  { id: 'strategy:new:theta-risk', q: 'Why does buying a short-dated option (close to expiration) carry more time-decay risk than a longer-dated one?', options: ["It doesn't — time decay is the same regardless of expiration", "Theta decay accelerates as expiration approaches, eroding the option's value faster with each passing day", 'Short-dated options have no theta decay', 'Only put options experience theta decay'], correct: 1, explain: "Theta decay isn't linear — it speeds up in the final weeks or days before expiration." },
  { id: 'strategy:new:crypto-leverage', q: 'Why is high leverage (e.g. 50x) especially dangerous in crypto perpetual futures?', options: ["It isn't dangerous if you're confident in the trade", 'A small adverse price move can trigger liquidation, wiping the position, because the margin cushion is so thin', 'Leverage only affects profits, never losses', 'Exchanges refund liquidated positions'], correct: 1, explain: 'At high leverage, only a tiny adverse move is needed to erase the margin backing the position.' },
  { id: 'strategy:new:overtrading', q: "What is 'overtrading'?", options: ['Taking more trades than your plan or edge justifies, often out of boredom or after a loss', 'Any day with more than one trade', 'Trading with too little size', 'Something that only applies to day traders, not swing traders'], correct: 0, explain: 'Overtrading means trading outside your actual edge or plan, usually chasing action rather than a real setup.' },
  { id: 'strategy:new:confirmation-vs-anticipation', q: "What's the difference between entering 'on confirmation' versus 'in anticipation' of a move?", options: ['There is no difference', 'Confirmation waits for price to actually break or hold a level before entering; anticipation enters before that proof, betting it will happen', 'Anticipation is always the safer approach', 'Confirmation entries always have worse risk/reward'], correct: 1, explain: 'Confirmation entries wait for the market to prove the move is happening; anticipation entries guess it will.' },
  { id: 'strategy:new:journaling-purpose', q: 'What is the main reason for keeping a detailed trade journal?', options: ["It's required by brokers", "Reviewing entries, exits, and process over many trades reveals patterns a single trade's P&L can't show", 'Only to track taxes', 'It replaces the need for a trading plan'], correct: 1, explain: "A journal's value comes from reviewing many trades together — patterns that don't show up in any single result." },
];

export function getStrategyCards(){
  const fromLessons = LESSONS.flatMap(lesson =>
    lesson.quiz.map((q, qi) => ({
      id: `strategy:${lesson.id}:${qi}`, deck: 'strategy',
      q: q.q, options: q.options, correct: q.correct, explain: q.explain,
    }))
  );
  const fromNew = NEW_STRATEGY_CARDS.map(c => ({ ...c, deck: 'strategy' }));
  return fromLessons.concat(fromNew);
}
```

- [ ] **Step 2: Verify it loads, ids are unique, and count is in the expected range**

Run: `node -e "import('./js/strategy-cards.js').then(m => { const c = m.getStrategyCards(); const ids = c.map(x=>x.id); console.log(c.length, new Set(ids).size); })"`
Expected: two equal numbers, roughly 40 (30 lifted from `LESSONS` + 10 new).

- [ ] **Step 3: Commit**

```bash
git add js/strategy-cards.js
git commit -m "$(cat <<'EOF'
Add strategy card deck derived from LESSONS plus new original cards

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012B8wnYDabxGxWcPBBiEWcy
EOF
)"
```

---

### Task 5: `js/state.js` — add `srsState` sync

**Files:**
- Modify: `js/state.js`

**Interfaces:**
- Produces (used by `js/practice.js` in Task 6):
  - `state.srsState: {cards: Record<string,{box:number,dueDate:string,lastSeen:string}>, streak: number, lastReviewDate: string|null}`
  - `state.srsLoaded: boolean`
  - Existing `persistProgress('srs', value)` now round-trips through both the Supabase `progress` table and the `tc-srs` localStorage fallback key, exactly like the other five progress keys already wired here.

- [ ] **Step 1: Add the default state fields**

In `js/state.js`, in the `state` object literal, change:

```javascript
  lessonsState: {},
  lessonsLoaded: false,
};
```

to:

```javascript
  lessonsState: {},
  lessonsLoaded: false,
  srsState: { cards: {}, streak: 0, lastReviewDate: null },
  srsLoaded: false,
};
```

- [ ] **Step 2: Wire `localOnlyMode`**

In `localOnlyMode(renderAll)`, change:

```javascript
  state.lessonsState = lsGet('tc-lessons', {});
  state.calLoaded = state.msLoaded = state.tradesLoaded = state.briefsLoaded = state.planLoaded = state.checklistLoaded = state.lessonsLoaded = true;
```

to:

```javascript
  state.lessonsState = lsGet('tc-lessons', {});
  state.srsState = lsGet('tc-srs', { cards: {}, streak: 0, lastReviewDate: null });
  state.calLoaded = state.msLoaded = state.tradesLoaded = state.briefsLoaded = state.planLoaded = state.checklistLoaded = state.lessonsLoaded = state.srsLoaded = true;
```

- [ ] **Step 3: Wire `initData`'s initial load**

In `initData`, change:

```javascript
      if(row.key === 'lessons') state.lessonsState = row.state || {};
    });
```

to:

```javascript
      if(row.key === 'lessons') state.lessonsState = row.state || {};
      if(row.key === 'srs') state.srsState = row.state || { cards: {}, streak: 0, lastReviewDate: null };
    });
```

and change:

```javascript
    state.calLoaded = state.msLoaded = state.tradesLoaded = state.briefsLoaded = state.planLoaded = state.checklistLoaded = state.lessonsLoaded = true;
```

to:

```javascript
    state.calLoaded = state.msLoaded = state.tradesLoaded = state.briefsLoaded = state.planLoaded = state.checklistLoaded = state.lessonsLoaded = state.srsLoaded = true;
```

- [ ] **Step 4: Wire the realtime `progress-changes` handler**

In `initData`'s `state.sb.channel('progress-changes')` handler, change:

```javascript
      if(row.key === 'lessons') state.lessonsState = (payload.eventType === 'DELETE') ? {} : (row.state || {});
      renderAll();
```

to:

```javascript
      if(row.key === 'lessons') state.lessonsState = (payload.eventType === 'DELETE') ? {} : (row.state || {});
      if(row.key === 'srs') state.srsState = (payload.eventType === 'DELETE') ? { cards: {}, streak: 0, lastReviewDate: null } : (row.state || { cards: {}, streak: 0, lastReviewDate: null });
      renderAll();
```

- [ ] **Step 5: Manually verify no syntax errors**

Run: `node --check js/state.js`
Expected: no output, exit code 0.

- [ ] **Step 6: Commit**

```bash
git add js/state.js
git commit -m "$(cat <<'EOF'
Wire srsState into the existing progress sync/localStorage pattern

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012B8wnYDabxGxWcPBBiEWcy
EOF
)"
```

---

### Task 6: Practice tab rendering (`js/practice.js`)

**Files:**
- Create: `js/practice.js`

**Interfaces:**
- Consumes:
  - `state`, `persistProgress` from `./state.js` (Task 5).
  - `CANDLE_PATTERNS`, `renderCandleSVG`, `getCandleCards` from `./candle-drill.js` (Task 2).
  - `getGlossaryCards` from `./glossary.js` (Task 3).
  - `getStrategyCards` from `./strategy-cards.js` (Task 4).
  - `todayStr`, `gradeCard`, `buildQueue`, `computeStreak` from `./srs.js` (Task 1).
  - DOM elements (added in Task 7): `#practice-header`, `#practice-body`.
- Produces (used by `js/app.js` in Task 7):
  - `renderPractice(): void`

- [ ] **Step 1: Write `js/practice.js`**

```javascript
// ---------- Practice tab: unified daily spaced-repetition review ----------
import { state, persistProgress } from './state.js';
import { CANDLE_PATTERNS, renderCandleSVG, getCandleCards } from './candle-drill.js';
import { getGlossaryCards } from './glossary.js';
import { getStrategyCards } from './strategy-cards.js';
import { todayStr, gradeCard, buildQueue, computeStreak } from './srs.js';

function allCards(){
  return [...getCandleCards(), ...getGlossaryCards(), ...getStrategyCards()];
}

function deckLabel(deck){
  return deck === 'candle' ? 'Candles' : deck === 'glossary' ? 'Glossary' : 'Strategy';
}

function shuffleArr(arr){
  const out = arr.slice();
  for(let i = out.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function pickDistractors(pool, excludeKey, keyFn, n){
  return shuffleArr(pool.filter(item => keyFn(item) !== excludeKey)).slice(0, n);
}

function buildPromptView(card){
  if(card.deck === 'candle'){
    const distractorNames = pickDistractors(CANDLE_PATTERNS, card.name, p => p.name, 3).map(p => p.name);
    return {
      promptHtml: `<div style="text-align:center;margin-bottom:10px;">${renderCandleSVG(card.candles)}</div>`,
      options: shuffleArr([card.name, ...distractorNames]),
      correctText: card.name,
      explainHtml: `${card.name} — this pattern is added to your Candles deck as you review it.`,
    };
  }
  if(card.deck === 'glossary'){
    const pool = getGlossaryCards();
    const distractorDefs = pickDistractors(pool, card.term, c => c.term, 3).map(c => c.definition);
    return {
      promptHtml: `<div style="font-weight:600;font-size:1.05rem;">${card.term}</div>`,
      options: shuffleArr([card.definition, ...distractorDefs]),
      correctText: card.definition,
      explainHtml: card.definition,
    };
  }
  return {
    promptHtml: `<div style="font-weight:600;">${card.q}</div>`,
    options: card.options.slice(),
    correctText: card.options[card.correct],
    explainHtml: card.explain,
  };
}

let sessionQueue = null;
let sessionIndex = 0;
let sessionAnswered = null; // chosen option index, or null
let sessionView = null;

function ensureSession(){
  if(sessionQueue) return;
  sessionQueue = buildQueue(allCards(), state.srsState.cards, todayStr(), 10);
  sessionIndex = 0;
  sessionAnswered = null;
  sessionView = null;
}

function renderDeckBars(){
  const decks = ['candle', 'glossary', 'strategy'];
  return decks.map(deck => {
    const cards = allCards().filter(c => c.deck === deck);
    const mastered = cards.filter(c => (state.srsState.cards[c.id] || {}).box === 6).length;
    return `<div style="margin-top:4px;font-size:.78rem;color:var(--muted);">${deckLabel(deck)}: ${mastered}/${cards.length} mastered</div>`;
  }).join('');
}

export function renderPractice(){
  ensureSession();
  const header = document.getElementById('practice-header');
  const body = document.getElementById('practice-body');
  if(!header || !body) return;

  const today = todayStr();
  const dueCount = allCards().filter(c => state.srsState.cards[c.id] && state.srsState.cards[c.id].dueDate <= today).length;
  header.innerHTML = `<div class="progress-label">Streak: ${state.srsState.streak || 0} day(s) &middot; ${dueCount} due today</div>${renderDeckBars()}`;

  if(sessionIndex >= sessionQueue.length){
    body.innerHTML = sessionQueue.length
      ? `<div class="empty-state">Session complete for today &mdash; nice work. <button class="btn primary" type="button" data-action="practice-restart" style="margin-top:10px;">Check for more</button></div>`
      : `<div class="empty-state">Nothing due right now. Come back tomorrow, or check for new cards.<div><button class="btn primary" type="button" data-action="practice-restart" style="margin-top:10px;">Check for more</button></div></div>`;
    return;
  }

  const card = sessionQueue[sessionIndex];
  if(!sessionView) sessionView = buildPromptView(card);
  const view = sessionView;

  const optionsHtml = view.options.map((opt, idx) => {
    let style = 'display:block;width:100%;text-align:left;margin-bottom:6px;';
    if(sessionAnswered !== null){
      if(opt === view.correctText) style += 'border-color:var(--good);background:var(--good-soft);color:var(--good);';
      else if(idx === sessionAnswered) style += 'border-color:var(--bad);background:var(--bad-soft);color:var(--bad);';
    }
    return `<button type="button" class="btn" style="${style}" data-opt-idx="${idx}" ${sessionAnswered !== null ? 'disabled' : ''}>${opt}</button>`;
  }).join('');

  const feedback = sessionAnswered !== null
    ? `<div style="margin-top:10px;">${view.options[sessionAnswered] === view.correctText ? '<span class="pill good">correct</span>' : '<span class="pill bad">incorrect</span>'}
        <p style="color:var(--muted);font-size:.83rem;margin:6px 0 0;">${view.explainHtml}</p></div>
       <div class="form-actions"><button class="btn primary" type="button" data-action="practice-next">Next</button></div>`
    : '';

  body.innerHTML = `<div style="font-size:.72rem;color:var(--muted);margin-bottom:8px;">${deckLabel(card.deck)} &middot; card ${sessionIndex + 1} / ${sessionQueue.length}</div>${view.promptHtml}${optionsHtml}${feedback}`;
}

function answerCurrent(idx){
  if(sessionAnswered !== null) return;
  const card = sessionQueue[sessionIndex];
  const view = sessionView;
  sessionAnswered = idx;
  const isCorrect = view.options[idx] === view.correctText;
  const today = todayStr();
  const newRecord = gradeCard(state.srsState.cards[card.id], isCorrect, today);
  const newStreak = computeStreak(state.srsState.streak || 0, state.srsState.lastReviewDate, today);
  state.srsState = {
    cards: { ...state.srsState.cards, [card.id]: newRecord },
    streak: newStreak,
    lastReviewDate: today,
  };
  persistProgress('srs', state.srsState);
  renderPractice();
}

function nextCard(){
  sessionIndex++;
  sessionAnswered = null;
  sessionView = null;
  renderPractice();
}

function restartSession(){
  sessionQueue = null;
  ensureSession();
  renderPractice();
}

document.getElementById('practice-body').addEventListener('click', (e) => {
  const optBtn = e.target.closest('button[data-opt-idx]');
  if(optBtn){ answerCurrent(parseInt(optBtn.dataset.optIdx, 10)); return; }
  const nextBtn = e.target.closest('button[data-action="practice-next"]');
  if(nextBtn){ nextCard(); return; }
  const restartBtn = e.target.closest('button[data-action="practice-restart"]');
  if(restartBtn){ restartSession(); }
});
```

- [ ] **Step 2: Verify no syntax errors**

Run: `node --check js/practice.js`
Expected: no output, exit code 0.

- [ ] **Step 3: Commit**

```bash
git add js/practice.js
git commit -m "$(cat <<'EOF'
Add Practice tab rendering: daily SRS queue, grading, deck progress

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012B8wnYDabxGxWcPBBiEWcy
EOF
)"
```

---

### Task 7: Wire the Practice tab into nav, app, and markup

**Files:**
- Modify: `js/nav.js`
- Modify: `js/app.js`
- Modify: `index.html`

**Interfaces:**
- Consumes: `renderPractice` from `./practice.js` (Task 6).
- Produces: a working `#practice` route reachable from the sidebar, replacing the old embedded Candle Drill card.

- [ ] **Step 1: Add the `practice` page to `js/nav.js`**

Change:

```javascript
export const pages = ['dashboard','calendar','journal','plan','scanner','lessons','milestones','brief'];
export const titles = {dashboard:'Dashboard', calendar:'Calendar', journal:'Trade Journal', plan:'Trading Plan', scanner:'Scanner', lessons:'Lessons', milestones:'Milestones', brief:'Daily Brief'};
```

to:

```javascript
export const pages = ['dashboard','calendar','journal','plan','scanner','lessons','practice','milestones','brief'];
export const titles = {dashboard:'Dashboard', calendar:'Calendar', journal:'Trade Journal', plan:'Trading Plan', scanner:'Scanner', lessons:'Lessons', practice:'Practice', milestones:'Milestones', brief:'Daily Brief'};
```

- [ ] **Step 2: Add the sidebar button in `index.html`**

In the `#side-nav` block, after the `lessons` button and before the `milestones` button, insert:

```html
      <button data-page="practice">
        <svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>
        <span>Practice</span>
      </button>
```

- [ ] **Step 3: Replace the embedded Candle Drill card with the Practice page section in `index.html`**

Remove this block from inside `<section id="page-lessons" ...>`:

```html
        <div class="card" id="candle-drill-card" style="margin-top:20px;">
          <h3>Candlestick Drill</h3>
          <p style="color:var(--muted);font-size:.86rem;margin:4px 0 14px;">Train pattern recognition daily &mdash; unlimited repeats, no pass/fail. Saved in this browser only, not synced.</p>
          <div class="progress-label" id="candle-drill-stats" style="margin-bottom:12px;"></div>
          <div id="candle-drill-body"></div>
        </div>
```

Immediately after the closing `</section>` of `page-lessons`, insert a new section:

```html
      <section id="page-practice" class="page" hidden>
        <p class="lede">Daily spaced-repetition review &mdash; candlestick patterns, trading terms, and strategy rules, mixed into one queue that repeats what you miss and backs off what you've mastered.</p>
        <div class="card">
          <div id="practice-header" style="margin-bottom:16px;"></div>
          <div id="practice-body"></div>
        </div>
      </section>
```

- [ ] **Step 4: Wire `js/app.js`**

Change:

```javascript
import { renderLessons } from './lessons.js';
import './candle-drill.js';
import './scanner.js';
```

to:

```javascript
import { renderLessons } from './lessons.js';
import { renderPractice } from './practice.js';
import './scanner.js';
```

Change:

```javascript
export function renderAll(){
  if(!(state.calLoaded && state.msLoaded && state.tradesLoaded && state.briefsLoaded && state.planLoaded && state.checklistLoaded && state.lessonsLoaded)) return;
```

to:

```javascript
export function renderAll(){
  if(!(state.calLoaded && state.msLoaded && state.tradesLoaded && state.briefsLoaded && state.planLoaded && state.checklistLoaded && state.lessonsLoaded && state.srsLoaded)) return;
```

Change:

```javascript
  renderLessons();
  renderDashboard();
}
```

to:

```javascript
  renderLessons();
  renderPractice();
  renderDashboard();
}
```

- [ ] **Step 5: Manually verify in the browser**

Run: `npm run dev`, open the printed local URL.

Checklist (all must pass):
- Sidebar shows a "Practice" entry between "Lessons" and "Milestones"; clicking it navigates to `#practice` and shows the page.
- The old Candle Drill card no longer appears on the Lessons page.
- The Practice page shows a streak line, deck-mastery lines for Candles/Glossary/Strategy, and a card prompt with 4 options.
- Clicking an option shows correct/incorrect coloring plus an explanation and a "Next" button; clicking "Next" advances to a new card.
- After answering ~10 cards, the queue eventually shows "Session complete for today" or "Nothing due right now" (whichever applies given the 10/day new-card cap).
- Reloading the page preserves the streak/box progress (check devtools → Application → Local Storage → `tc-srs`, or Network tab showing a Supabase `progress` upsert if connected).
- No console errors on the Lessons, Practice, or Dashboard pages.

- [ ] **Step 6: Commit**

```bash
git add js/nav.js js/app.js index.html
git commit -m "$(cat <<'EOF'
Wire Practice tab into nav/app, remove old embedded candle drill

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012B8wnYDabxGxWcPBBiEWcy
EOF
)"
```

---

## Spec Coverage Check

- Candle deck reuse — Task 2. ✅
- Glossary deck (~60-80 terms) — Task 3 (65 terms). ✅
- Strategy deck (~40 cards, LESSONS-derived + new) — Task 4 (30 + 10 = 40). ✅
- Leitner engine, 6 boxes, `[0,1,3,7,14,30]` — Task 1. ✅
- Daily queue: due + up to 10 new, round-robin across decks — Task 1 (`buildQueue`) + Task 6 (`ensureSession`). ✅
- Streak tracking — Task 1 (`computeStreak`) + Task 6. ✅
- Sync via existing `progress` table pattern, `tc-srs` fallback — Task 5. ✅
- New Practice tab UI, replacing Candle Drill's own tab — Task 6 + Task 7. ✅
- `LESSONS` / `js/lessons.js` untouched — confirmed, Task 4 only imports and reads it. ✅
- No transcript/blog scraping or verbatim third-party text — confirmed, all content in Tasks 3-4 is original. ✅
