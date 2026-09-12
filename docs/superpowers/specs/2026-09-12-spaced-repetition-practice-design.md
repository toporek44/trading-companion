# Spaced-Repetition Practice System — Design

## Goal
Turn quiz/drill content from two disconnected, non-repeating pieces
(`lessons.js` one-shot quizzes, `candle-drill.js` endless random drill) into
one language-app-style daily practice system: candlestick patterns, trading
terminology, and strategy/rule questions all reviewed on a spaced-repetition
schedule that adapts to what the user gets wrong.

## Content sourcing (important constraint)
No verbatim scraping/storage of YouTube transcripts or Warrior Trading blog
text — copyright risk, and a lightly-reworded copy is still a problem. All
new quiz content (glossary terms, strategy cards) is original writing based
on general trading knowledge and the concepts already established in this
repo's reference PDFs (`docs/reference/`) and existing `LESSONS` content —
same approach already used for the existing lesson quizzes.

## Content additions
1. **Candle deck** — reuse existing `CANDLE_PATTERNS` (21 patterns) from
   `candle-drill.js` as SRS cards. No new data needed; `renderCandleSVG` and
   the pattern array move to shared use by both the old single-drill view
   (removed) and the new deck.
2. **Glossary deck** (`js/glossary.js`, new) — ~60-80 original term cards
   covering: order types (market/limit/stop/stop-limit/trailing stop),
   chart/indicator terms (VWAP, MACD, RSI, relative volume, float, Level 2,
   time & sales, support/resistance), options vocabulary (call/put, strike,
   premium, IV, theta decay, assignment), crypto vocabulary (spot vs
   perpetual, funding rate, liquidation, slippage), and risk terms (R-multiple,
   drawdown, position sizing, expectancy) — each card: `{term, definition,
   distractors[]}` rendered as MCQ (term → correct definition, 3 wrong
   definitions drawn from other cards in the deck).
3. **Strategy deck** (`js/strategy-cards.js`, new) — ~40 cards. Existing
   `LESSONS[].quiz` questions (already ~30 across 10 lessons) are lifted into
   this format 1:1 (they're already original MCQ+explain content); add new
   cards to fill gaps the current lessons don't cover as standalone
   reviewable facts (e.g. breakeven win-rate table values, R:R pillars,
   Alpha/Beta/Live thresholds already exist — add a handful more on
   entry/exit mechanics not yet covered). Card shape matches lesson quiz
   question shape: `{id, q, options[], correct, explain}`.
   `LESSONS` itself is untouched — lesson body text + one-shot quiz stays as
   the first-read teaching material; the strategy deck is a separate,
   repeatable copy of the same facts for spaced review.

## SRS engine (`js/srs.js`, new)
- **Algorithm:** Leitner, 6 boxes. Box → interval in days: `[0, 1, 3, 7, 14,
  30]` (box 1 = due same day / immediately repeatable within a session, box 6
  = mastered, reviewed monthly).
- **Card record:** `{box: 1-6, dueDate: 'YYYY-MM-DD', lastSeen: 'YYYY-MM-DD'}`
  keyed by a stable card id (`candle:<name>`, `glossary:<term-slug>`,
  `strategy:<id>`). Cards absent from the record are "unseen."
- **Grading:** correct → `box = min(box+1, 6)`, `dueDate = today +
  intervals[box]`. Wrong → `box = 1`, `dueDate = today` (so it resurfaces
  same session/next day).
- **Daily queue build:**
  1. All cards with `dueDate <= today` (due reviews), across all three decks,
     shuffled together.
  2. Up to 10 unseen cards appended (new-card introduction cap/day), picked
     round-robin across decks so no single deck dominates a session.
  3. Session ends when queue is empty; user can restart to pull more due
     cards same day if any remain (unlikely given the cap).
- **Streak:** consecutive calendar days with ≥1 card reviewed. Same logic
  shape as current `candle-drill.js` `loadCandleDrillStats` day-rollover
  check, generalized to the new state shape.

## Sync (reuses existing infra, no schema change)
- One `progress` row, `key: 'srs'`, `state: {cards: {<cardId>: {box,
  dueDate, lastSeen}}, streak: number, lastReviewDate: 'YYYY-MM-DD'}`.
- Loaded/saved via the existing generic `persistProgress('srs', value)` and
  the existing `progress` realtime channel in `state.js` (same pattern as
  `calendar`/`milestones`/`tradingplan`/`checklist`/`lessons` today) — add one
  more `if(row.key === 'srs')` branch in the three places that pattern
  already repeats (`initData` load, realtime handler, `localOnlyMode`
  fallback under `tc-srs`).

## UI (`js/practice.js`, new; replaces candle-drill's own tab)
New "Practice" nav tab:
- Header: current streak, count of cards due today, count of new cards
  available today.
- "Start review" button → one card at a time, MCQ style matching existing
  lesson-quiz visual treatment (option buttons, click → immediate
  correct/wrong color + explanation shown, then "Next").
- After each answer: box transition applied and persisted immediately (not
  batched) so a mid-session refresh doesn't lose progress.
- Footer: per-deck progress bars (candles / glossary / strategy) showing
  count of cards in each box 1-6, so the user can see mastery growing over
  time — this is the "leveling up" visual, analogous to a language app's
  skill tree.

## Files touched
- New: `js/glossary.js`, `js/strategy-cards.js`, `js/srs.js`, `js/practice.js`
- Edit: `js/state.js` (add `srsState`/`srsLoaded`, load/save/realtime
  branches), `js/nav.js` (swap Candle Drill tab for Practice tab),
  `index.html` (new tab markup/container ids), `js/candle-drill.js` (keep
  `CANDLE_PATTERNS` + `renderCandleSVG` as shared exports; remove its own
  standalone stats/loop/tab-rendering code — that responsibility moves into
  `practice.js`), `js/app.js` (wire up new tab's init/render call).
- Untouched: `js/lessons.js` (`LESSONS` stays as first-read teaching
  content with its existing one-shot quiz; strategy deck is a derived copy,
  not a replacement).

## Out of scope
- No SM-2/ease-factor scheduling (Leitner only, per approved design).
- No transcript/blog scraping or verbatim storage of third-party text.
- No changes to Scanner, Journal, Calendar, or Plan tabs.
