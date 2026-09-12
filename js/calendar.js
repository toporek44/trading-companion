import { state, persistProgress } from './state.js';
import { renderAll } from './app.js';

// ---------- Week/day plan data (shared by Calendar + Dashboard) ----------
export const WEEKS = [
  { theme: "Chart & platform literacy", days: [
    ["Candlestick anatomy — open/high/low/close, and why a stock's story reads left to right", "Create your TradingView account; build a watchlist called \"Small-Cap Movers\" and add 10 tickers from today's Scanner tab top gainers"],
    ["Timeframes — how the same stock looks different on 1m/5m/daily", "Open one watchlist stock on 3 timeframes side by side; note where the trend agrees or disagrees"],
    ["Support & resistance — why price \"remembers\" round numbers and prior highs/lows", "Draw horizontal S/R lines on 5 watchlist stocks, at least 2 levels each"],
    ["Trend basics — higher highs/lows, moving averages (9/20/200 EMA)", "Add a 9/20/200 EMA template; classify all 10 watchlist stocks as uptrend, downtrend, or range"],
    ["Order types — market, limit, stop, and why a market order on a thin-float stock can slip badly", "Place every order type on TradingView's paper trading panel without hesitating"],
  ]},
  { theme: "Tools, alerts & your journal", days: [
    ["How this app's Scanner tab works — the 5 Pillars, and why price/volume/float/catalyst are checked together", "Add your free Alpha Vantage API key in the Scanner tab and run your first Refresh"],
    ["Bar Replay — why blind drilling beats reading about patterns", "Run 10 blind Bar Replay drills on a watchlist stock; log your call before revealing the outcome"],
    ["Reading MACD and volume together — the two-signal gate you'll use before every entry (Lessons: The MACD + volume filter)", "Watch 10 setups through a session; for each, write MACD yes/no and Volume yes/no before seeing what happens next"],
    ["What the Journal tab tracks and why — the 5-pillars fields, R-multiple, process-followed", "Log your first Journal entry, even if it's a no-trade decision"],
    ["Review — what from weeks 1-2 still feels shaky?", "Full dry run of the morning routine (Scanner → shortlist → MACD/volume check → chart check → journal) on paper, process only"],
  ]},
  { theme: "Strategy 1: The Pullback pattern", days: [
    ["The Pullback pattern — buy the first green candle making a new high after a dip, only once MACD and volume both say yes", "Watch the open a full session; log every pullback setup on your watchlist, noting MACD/volume for each, without trading"],
    ["Entry rules — the exact checklist for a valid pullback entry", "First paper trade, using the full checklist (Pillars + MACD + volume + pullback entry)"],
    ["Stop-loss placement — the low of the pullback, in both % and $ terms", "Second paper trade; write the stop's reasoning (and its $ value) before entry"],
    ["Position sizing math — turning the Plan tab's ~5% account risk into a share count", "Third paper trade; show your sizing calculation in the journal notes"],
    ["Where pullback trades fail — MACD rolling over or high-volume red candles even after a valid-looking dip", "Review this week's trades; tag each process followed/broken"],
  ]},
  { theme: "Reps and risk", days: [
    ["Multi-timeframe confluence — does the 1-min setup agree with the daily trend?", "Two more paper trades, noting the higher-timeframe context for each"],
    ["Exit discipline — recognizing when a thesis is invalidated vs. just being uncomfortable", "Manage any open position to a rule-based exit, not a gut-feel one"],
    ["R-multiples and the breakeven win-rate table (Lessons) — why ~33% win rate is enough at 2:1", "20-minute Bar Replay drill; compute the R-multiple on your last 5 trades"],
    ["News catalyst quality — why a merger/buyout catalyst is excluded, and what \"fresh\" news means (Scanner tab)", "Check news freshness on 3 watchlist tickers using the Scanner's Check News button"],
    ["Weekly review methodology", "Full weekly review; tally trades toward your 40-trade minimum"],
  ]},
  { theme: "Strategy 2: Bull Flag Breakout", days: [
    ["The Bull Flag Breakout — buy the first candle making a new high after a flag, once MACD and volume both confirm", "Screen for a flag setup on your watchlist; log MACD/volume for it without trading"],
    ["Confirming volume on the breakout candle specifically, not just the pattern shape", "First Bull Flag paper trade, entering only on confirmation"],
    ["The Bull Flag Trap — false breakouts that look valid but fail (docs/reference/chart-patterns.pdf)", "Review 5 historical \"breakouts\" via Bar Replay; classify real vs. trap using MACD/volume"],
    ["Combining the Bull Flag with the 5 Pillars score", "Second trade, checking the Scanner's Pillars badge before entry"],
    ["Review — Pullback vs. Bull Flag results so far", "Update your journal's running expectancy per strategy (By Strategy stats card)"],
  ]},
  { theme: "Strategy 3: Flat Top Breakout", days: [
    ["The Flat Top Breakout — buy the first candle that closes above a horizontal resistance line", "Identify 3 stocks currently coiling under a flat top on your watchlist"],
    ["Where flat top trades fail — low-volume \"breakouts\" that fade back below the line", "First Flat Top paper trade, on confirmation only"],
    ["The Flat Bottom Breakdown — the bearish mirror, for context even if you only trade long", "Review one historical flat-bottom breakdown via Bar Replay"],
    ["The Double Top — two peaks at the same round number, broken on the third attempt (Lessons: Chart pattern catalog)", "Third trade this week, using whichever of the 3 strategies your setup matches"],
    ["Weekly review — three strategies compared side by side", "Full review of By Strategy stats; note which pattern you're reading fastest"],
  ]},
  { theme: "Chart pattern catalog & traps", days: [
    ["ABCD pattern, Head & Shoulders, Bull Trap, Bear Trap (Lessons: Chart pattern catalog)", "20-minute Bar Replay drill mixing all patterns learned so far"],
    ["The exhaustion signal — first candle against a 5+ candle run", "Paper trade only if a valid setup appears; otherwise log the no-trade decision"],
    ["The 15-minute Scanner-to-watchlist routine, end to end", "Run it live before your session: Refresh → sort by Change% → shortlist top 5-10 → MACD/volume check → chart check"],
    ["Risk-of-ruin math — why consecutive losses compound faster than they feel", "Paper trade; stop for the day if you hit 3 consecutive losers (per the Plan tab's risk rules)"],
    ["Journaling deeper — grading setup quality independent of outcome", "Re-grade your last 10 trades A/B/C on Pillars + MACD/volume quality, regardless of P&L"],
  ]},
  { theme: "Consolidation & first expectancy checkpoint", days: [
    ["What \"expectancy\" means and how the Journal tab's stats compute it", "Check your Journal Stats cards; note your current win rate and average R"],
    ["Which of the 3 strategies fits you best so far", "Paper trade using whichever strategy your By Strategy stats currently favor"],
    ["Sizing up responsibly — when, if ever, to increase risk per trade", "Paper trade; hold size steady regardless of recent wins"],
    ["Building a personal pre-trade checklist from everything so far (Plan tab's Pre-Trading Checklist)", "Fill out today's Pre-Trading Checklist before your session"],
    ["Full system review — is your win rate and P/L ratio tracking toward the Profit Trifecta's Novice tier?", "Check the Plan tab's Trifecta callout against your actual numbers"],
  ]},
  { theme: "Research routine, deepened", days: [
    ["Top-down analysis — market strength first, then sector, then the individual stock (Plan tab's \"market strength 0-10\" check)", "Rate today's market strength before you even open the Scanner"],
    ["Reading an economic calendar for anything that could move the whole market today", "Check a free economic calendar pre-market; note any high-impact release"],
    ["Sourcing ideas responsibly — vetting a claim before trusting it", "Read 2 TradingView Ideas posts on a watchlist stock; write your own agree/disagree"],
    ["What the \"obvious stock\" of the day means, and why it usually gets the best follow-through", "Name today's obvious stock in the Pre-Trading Checklist and explain why"],
    ["Weekly review — is research actually improving your results?", "Compare weeks with vs. without a written pre-market thesis"],
  ]},
  { theme: "Candlestick mastery", days: [
    ["Bullish single-candle patterns — hammer, inverted hammer, dragonfly doji (docs/reference/candlestick-pattern-reference.pdf)", "5 rounds of the Candlestick Drill (Lessons tab)"],
    ["Bearish single-candle patterns — hanging man, shooting star, gravestone doji", "5 more rounds of the Candlestick Drill"],
    ["Double/triple patterns — engulfing, tweezer tops/bottoms, morning/evening star, three soldiers/crows", "5 more rounds; aim for under 5 seconds per correct call"],
    ["Spaced repetition — why retesting in 4, then 11, then 30 days beats cramming", "Run the drill again today even on patterns you already know cold"],
    ["Weekly review — Candlestick Drill stats and this week's trades together", "Check your Candlestick Drill streak; full trade review"],
  ]},
  { theme: "Alpha readiness", days: [
    ["The Alpha → Beta → Live progression (Lessons) — Alpha is high-volume sim reps with no money on the line", "Pull your last 20+ trades; compute win rate and average R"],
    ["Revisiting the risk rules against your real numbers — $50→$100, ~10% daily max loss, 3-loss stop, and walking away after giving back half a good day's gains", "Recalculate your risk rules for a live $1,000 account (Plan tab calculator)"],
    ["What changes psychologically between paper and live", "Write a short \"live trading rules\" page for yourself, referencing your journal data"],
    ["Final gap-check — reread the Milestones tab's exit criteria line by line", "Honestly mark which milestones are met, which aren't yet"],
    ["Plan your Beta stage — one A+ (5/5 pillars, MACD + volume confirmed) setup a day, 10 straight days", "If Alpha criteria are met, start counting your Beta streak; if not, extend this rhythm"],
  ]},
  { theme: "Beta stage & live-readiness", days: [
    ["What counts as an A+ setup for Beta — full 5/5 pillars AND MACD + volume both confirming, not a partial match", "Beta day 1: trade only if a genuine A+ setup appears; otherwise no trade"],
    ["Staying disciplined when day 1 of Beta is a loss", "Beta day 2, same rule: one A+ setup or no trade"],
    ["Position sizing for Beta — small real size, same rules as paper", "Beta day 3"],
    ["Tracking your Beta streak in the Journal and Milestones tabs", "Beta day 4; check your running Beta streak"],
    ["What graduating Beta actually means — and what to expect from your first live-size week after", "Beta day 5; if the week nets green, you're one week closer to a 10-day Beta pass"],
  ]},
];
export const TOTAL_DAYS = WEEKS.reduce((n,w) => n + w.days.length, 0);

async function toggleCalDay(key, val){
  state.calState = {...state.calState, [key]: val};
  renderAll();
  await persistProgress('calendar', state.calState);
}

// ---------- Calendar rendering ----------
let openWeeks = {0:true};
export function findTodayKey(){
  for(let wi=0; wi<WEEKS.length; wi++){
    for(let di=0; di<WEEKS[wi].days.length; di++){
      if(!state.calState[`${wi}-${di}`]) return {wi, di};
    }
  }
  return null;
}

export function renderCalendar(){
  const root = document.getElementById('cal-weeks');
  if(!root) return;
  root.innerHTML = '';
  const todayKey = findTodayKey();
  let dayCounter = 0, totalDone = 0;
  WEEKS.forEach((week, wi) => {
    const startDay = dayCounter + 1;
    const doneInWeek = week.days.filter((_, di) => state.calState[`${wi}-${di}`]).length;
    const block = document.createElement('div');
    block.className = 'week-block' + (openWeeks[wi] ? ' open' : '');
    block.innerHTML = `
      <div class="week-header" data-wi="${wi}">
        <div class="w-title"><span class="w-num">${String(wi+1).padStart(2,'0')}</span><span class="w-theme">${week.theme}</span></div>
        <div style="display:flex;align-items:center;gap:10px;">
          <span class="w-meta">Days ${startDay}–${startDay+4} &middot; ${doneInWeek}/5</span>
          <span class="chev">&#9656;</span>
        </div>
      </div>
      <div class="week-days"></div>`;
    const daysWrap = block.querySelector('.week-days');
    week.days.forEach((d, di) => {
      dayCounter++;
      const key = `${wi}-${di}`;
      const done = !!state.calState[key];
      if(done) totalDone++;
      const isToday = todayKey && todayKey.wi === wi && todayKey.di === di;
      const row = document.createElement('label');
      row.className = 'day-row' + (done ? ' done' : '') + (isToday ? ' today' : '');
      row.innerHTML = `
        <input type="checkbox" ${done ? 'checked' : ''} data-key="${key}">
        <div>
          <div class="d-label" style="margin-bottom:6px;">DAY ${dayCounter}${isToday ? ' — TODAY' : ''}</div>
          <div class="d-body">
            <div class="d-col"><span class="k">Learn (1hr)</span><span class="v">${d[0]}</span></div>
            <div class="d-col"><span class="k">Practice (1hr)</span><span class="v">${d[1]}</span></div>
          </div>
        </div>`;
      daysWrap.appendChild(row);
    });
    root.appendChild(block);
  });
  document.getElementById('cal-progress-label').textContent = `${totalDone} / ${TOTAL_DAYS} days complete`;
  document.getElementById('cal-progress-fill').style.width = (totalDone/TOTAL_DAYS*100) + '%';
}
document.getElementById('cal-weeks').addEventListener('click', (e) => {
  const header = e.target.closest('.week-header');
  if(header){ openWeeks[header.dataset.wi] = !openWeeks[header.dataset.wi]; renderCalendar(); }
});
document.getElementById('cal-weeks').addEventListener('change', (e) => {
  if(e.target.matches('input[type="checkbox"]')) toggleCalDay(e.target.dataset.key, e.target.checked);
});
