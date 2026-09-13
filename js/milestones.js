import { state, persistProgress } from './state.js';
import { renderAll } from './app.js';

// Optional `hint(trades)` — a live read from the trader's own Journal data,
// shown under the description as a nudge toward checking the box honestly
// (not auto-checked; self-report stays the source of truth, same "nudge
// not lock" stance as the circuit-breaker banner).
export const MILESTONES = [
  {t:"Set up TradingView workspace", d:"Layouts, watchlists, screener, paper trading panel configured"},
  {t:"Can read candlesticks & place all order types", d:"Market, limit, stop, stop-limit — without hesitating"},
  {t:"Trading journal in active use", d:"Logging entries here in the Journal tab consistently"},
  {t:"20 stock paper trades logged", d:"Pullback, Bull Flag, or Flat Top setup, one position at a time",
    hint: (trades) => `${trades.filter(t => t.market === 'Stock').length}/20 stock trades logged so far`},
  {t:"40+ stock paper trades, expectancy checked", d:"Reviewed last 30+ trades for positive/breakeven expectancy",
    hint: (trades) => {
      const stock = trades.filter(t => t.market === 'Stock');
      if(stock.length === 0) return `0/40 stock trades logged so far`;
      const totalPnl = stock.reduce((s,t) => s + (t.resultAmount||0), 0);
      const expectancy = totalPnl / stock.length;
      return `${stock.length}/40 stock trades &mdash; expectancy ${expectancy>=0?'+':'-'}$${Math.abs(expectancy).toFixed(2)}/trade`;
    }},
  {t:"Chart pattern catalog memorized", d:"Can name Bull Flag, Flat Top, ABCD, Double Top, Head & Shoulders, Bull/Bear Trap from a chart in under 5 seconds"},
  {t:"Daily Scanner routine dialed in", d:"Using the Scanner tab's 15-minute routine to build a real premarket watchlist every session"},
  {t:"Risk rules internalized", d:"Can state the $50→$100 rule, ~10% daily max loss, and the 3-consecutive-loss stop from memory"},
  {t:"Beta-phase readiness check passed", d:"10 straight trading days, one A-plus (5/5 pillars, MACD + volume confirmed) setup per day, the whole stretch nets green",
    // The Calendar curriculum's own copy (Week 12) tells the user to
    // "track your Beta streak in the Journal and Milestones tabs" — but
    // nothing ever computed one. Can only automate the two objectively
    // trackable halves of the rule (a 5/5-Pillars trade that day, and the
    // day nets green) — MACD/volume confirmation isn't a field this
    // Journal captures, so the hint says so explicitly rather than
    // silently pretending to check the whole rule.
    //
    // "Straight" here means straight qualifying TRADING days, not straight
    // calendar days — a trader who quits for a month and comes back keeps
    // their old streak alive, since the walk only looks at days that
    // actually have trades logged, with no check for a calendar-date gap
    // between them. That matches computeStats()'s own currentStreak
    // elsewhere in this app (also trade-order, not calendar-order), so
    // it's consistent rather than a one-off inconsistency — but it's worth
    // being explicit about in the copy, since "10 straight trading days"
    // could otherwise read as 10 consecutive calendar days.
    hint: (trades) => {
      const byDay = {};
      trades.filter(t => t.market === 'Stock' && t.date).forEach(t => (byDay[t.date] = byDay[t.date] || []).push(t));
      const days = Object.keys(byDay).sort();
      let streak = 0;
      for(let i = days.length - 1; i >= 0; i--){
        const list = byDay[days[i]];
        const hasAPlus = list.some(t => t.pillarsCount === 5);
        const netGreen = list.reduce((s,t) => s + (t.resultAmount||0), 0) > 0;
        if(hasAPlus && netGreen) streak++; else break;
      }
      return `${streak}/10 qualifying trading days in a row so far (5/5-Pillar trade + net green each day, not necessarily 10 straight calendar days) — MACD/volume confirmation is still yours to judge`;
    }},
  {t:"First live stock trade placed", d:"$1,000 account, 1% max risk, full journal entry"},
  {t:"First month of live trading reviewed", d:"Monthly journal review completed, sizing reassessed from data"}
];

async function toggleMilestone(idx, val){
  state.msState = {...state.msState, [idx]: val};
  renderAll();
  await persistProgress('milestones', state.msState);
}

// ---------- Milestones rendering ----------
export function renderMilestones(){
  const root = document.getElementById('ms-list');
  root.innerHTML = '';
  let done = 0;
  MILESTONES.forEach((m, i) => {
    const isDone = !!state.msState[i];
    if(isDone) done++;
    const row = document.createElement('label');
    row.className = 'day-row' + (isDone ? ' done' : '');
    const hintHtml = m.hint ? `<span style="display:block;font-size:.78rem;color:var(--accent);margin-top:2px;">${m.hint(state.trades)}</span>` : '';
    row.innerHTML = `<input type="checkbox" ${isDone?'checked':''} data-idx="${i}">
      <div><strong style="display:block;font-size:.92rem;">${m.t}</strong><span style="font-size:.83rem;color:var(--muted);">${m.d}</span>${hintHtml}</div>`;
    root.appendChild(row);
  });
  document.getElementById('ms-progress-label').textContent = `${done} / ${MILESTONES.length} complete`;
  document.getElementById('ms-progress-fill').style.width = (done/MILESTONES.length*100)+'%';
}
document.getElementById('ms-list').addEventListener('change', (e) => {
  if(e.target.matches('input[type="checkbox"]')) toggleMilestone(e.target.dataset.idx, e.target.checked);
});
