import { state, persistProgress } from './state.js';
import { renderAll } from './app.js';

// ---------- Week/day plan data (shared by Calendar + Dashboard) ----------
export const WEEKS = [
  { theme: "Chart & platform literacy", days: [
    ["Markets 101 — futures contracts, tick size & tick value, order types (market/limit/stop)", "Create your TradingView account, build an \"Index Futures\" watchlist (ES, NQ, YM, RTY, plus CL and GC)"],
    ["Candlestick anatomy — open/high/low/close, what body & wick tell you", "Step through 10 random candles on the ES 1H chart and narrate what each shows"],
    ["Timeframes — how the story changes across 1m/5m/1H/Daily", "Open ES on 4 timeframes side by side; note where the trend agrees or disagrees"],
    ["Support & resistance — why price \"remembers\" levels", "Draw horizontal S/R lines on 5 futures charts (ES, NQ, CL, GC, 6E), at least 2 levels each"],
    ["Trend basics — higher highs/lows, moving averages (20/50/200)", "Add your MA template; classify ES, NQ, CL, GC, and RTY as uptrend, downtrend, or range"],
  ]},
  { theme: "Tools, alerts & your journal", days: [
    ["How the Futures Screener works — filter fields, saving presets", "Build and save your first futures screener preset (relative volume, ATR, trend filter)"],
    ["Bar Replay — why blind drilling beats reading about patterns", "Run 10 blind Bar Replay drills on ES; log your call before revealing each outcome"],
    ["Alerts — price vs. indicator conditions, delivery options", "Set 5 price alerts on your futures watchlist so you stop staring at charts"],
    ["What a trading journal needs — the columns that matter", "Log your first entry right here in the Journal tab"],
    ["Review — what from weeks 1-2 still feels shaky? Also: RTH vs. Globex session hours", "Full dry run of the daily routine on paper, process only, during regular trading hours"],
  ]},
  { theme: "Strategy 1: VWAP & trend trading", days: [
    ["VWAP logic — trading with/against VWAP, anchored VWAP (Section 10: Brian Shannon, Anthony Crudele)", "Connect Paper Trading; watch ES and NQ a full session, log VWAP relationship without trading"],
    ["Entry rules — the exact checklist for a VWAP reclaim/rejection", "First paper trade, using the checklist in full"],
    ["Stop-loss placement — structure-based vs. ATR-based, in ticks and dollars", "Second paper trade; write the stop's reasoning (and its $ value) before entry"],
    ["Position sizing math — turning 1-2% risk into a contract count", "Third paper trade; show your sizing calculation in the journal"],
    ["Where VWAP trades fail — low-volume, choppy overnight sessions", "Review this week's trades; tag process followed/broken"],
  ]},
  { theme: "Reps and risk", days: [
    ["Multi-timeframe confluence — 5-min vs. daily VWAP", "Two more paper trades, noting the higher-timeframe context"],
    ["Exit discipline — recognizing an invalidated thesis", "Manage any open position to a rule-based exit"],
    ["Pattern drill day — engulfing, hammer, doji, plus the Bull Flag Breakout and Flat Top Breakout momentum entries (buy the first candle making a new high / breaking the flat top)", "20-minute Bar Replay drill; one more paper trade if valid"],
    ["Economic calendar awareness — Fed speakers, CPI/NFP, how they move ES/NQ", "Check the calendar before trading; note any high-impact window in your research journal"],
    ["Weekly review methodology", "Full weekly review; tally trades toward your 40-trade minimum"],
  ]},
  { theme: "VWAP trading toward mastery", days: [
    ["Position management — scaling out, trailing stops in tick terms", "Paper trade using a trailing-stop exit"],
    ["Reading volume/delta with trend — confirmation vs. divergence", "One more paper trade; note volume confirmation"],
    ["Chart pattern set — flags, wedges, triangles", "20-minute Bar Replay drill on this set"],
    ["Common psychological traps — revenge trading, FOMO", "Paper trade; explicitly check for either trap"],
    ["Mid-program self-assessment", "Pull your last 15 trades; compute win rate and avg win/loss"],
  ]},
  { theme: "Strategy 2: Market Profile & range trading", days: [
    ["Market Profile logic — value area, balance vs. imbalance (Section 10: Jim Dalton, ShadowTrader)", "Identify 3 futures markets currently in balance; dedicated watchlist"],
    ["Confirming reversals at value-area edges", "First Market-Profile paper trade, on confirmation only"],
    ["Where range trades fail — imbalance breaking out of value", "Second trade; predefine the invalidation level"],
    ["Combining Market Profile context with the daily trend", "Third trade with higher-timeframe trend noted"],
    ["Review — VWAP-trend vs. Market-Profile-range results so far", "Update your journal's running expectancy per strategy"],
  ]},
  { theme: "Range reps + breakout / order flow intro", days: [
    ["Breakout trading logic — why volume/delta confirmation matters", "Screen for a volume-confirmed breakout; trade if found"],
    ["False breakouts — the most common trap", "Review 5 historical breakouts via Bar Replay"],
    ["The 15-minute screener routine, end to end", "Run it live before your session"],
    ["Risk-of-ruin math, in contract terms", "Paper trade; stop at your daily loss limit if hit"],
    ["Journaling deeper — grading setup quality", "Re-grade your last 10 trades A/B/C on setup quality"],
  ]},
  { theme: "Consolidation & first expectancy checkpoint", days: [
    ["What \"expectancy\" means and how to calculate it", "Calculate expectancy across all logged trades so far"],
    ["Which strategy fits you best so far", "Paper trade using whichever strategy your data favors"],
    ["Sizing up responsibly", "Paper trade; hold size steady regardless of recent wins"],
    ["Building a personal pre-trade checklist", "Write your final checklist; use it today"],
    ["Full system review — Phase 1 exit-criteria checkpoint", "Check the Milestones and Journal tabs against your criteria"],
  ]},
  { theme: "Research routine, deepened", days: [
    ["Top-down analysis — macro → sector → instrument", "Write a full top-down research note before trading today"],
    ["Reading the economic calendar and CME contract specs/rollover dates together", "Check both pre-market; note any high-impact window or front-month rollover to avoid"],
    ["Sentiment tools — COT report positioning, VIX level", "Check today's COT/VIX reading; note it in your research journal"],
    ["Sourcing ideas responsibly", "Read 2 TradingView Ideas posts; write your own agree/disagree"],
    ["Weekly review — is research actually helping?", "Compare weeks with vs. without a written thesis"],
  ]},
  { theme: "Options vocabulary & Phase 2 setup", days: [
    ["Options vocabulary — strike, expiration, premium", "Set up a thinkorswim paperMoney account"],
    ["The Greeks conceptually — delta, theta, vega", "Explore an option chain; identify delta/theta for 3 strikes"],
    ["Implied volatility and IV rank", "Check IV rank on Barchart for 2 stocks"],
    ["Covered calls — mechanics and when they make sense", "Paper-trade your first covered call"],
    ["Cash-secured puts — mechanics", "Paper-trade your first cash-secured put"],
  ]},
  { theme: "Options paper trading reps", days: [
    ["Vertical credit spreads — defined-risk mechanics", "Paper-trade your first credit spread"],
    ["Choosing strikes by delta, not gut feel", "Second spread, strikes at ~0.20-0.30 delta"],
    ["Managing assignment risk", "Review open positions for assignment risk"],
    ["Broker options approval tiers", "Check your real broker's tier system"],
    ["Weekly review — options vs. futures trades", "Journal review across both books"],
  ]},
  { theme: "System review & live-readiness", days: [
    ["Iron condors conceptually", "Paper-trade one if comfortable; otherwise another spread"],
    ["Revisiting the risk framework against real numbers", "Recalculate your 1-2% risk unit for a live $1,000 account"],
    ["What changes between paper and live", "Write a short \"live trading rules\" page for yourself"],
    ["Final gap-check on exit criteria", "Honestly mark which criteria are met, which aren't"],
    ["Plan your first live week", "If criteria are met, place your first live trade; if not, extend"],
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
