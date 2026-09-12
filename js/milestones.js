import { state, persistProgress } from './state.js';
import { renderAll } from './app.js';

export const MILESTONES = [
  {t:"Set up TradingView workspace", d:"Layouts, watchlists, screener, paper trading panel configured"},
  {t:"Can read candlesticks & place all order types", d:"Market, limit, stop, stop-limit — without hesitating"},
  {t:"Trading journal in active use", d:"Logging entries here in the Journal tab consistently"},
  {t:"20 stock paper trades logged", d:"Pullback, Bull Flag, or Flat Top setup, one position at a time"},
  {t:"40+ stock paper trades, expectancy checked", d:"Reviewed last 30+ trades for positive/breakeven expectancy"},
  {t:"Chart pattern catalog memorized", d:"Can name Bull Flag, Flat Top, ABCD, Double Top, Head & Shoulders, Bull/Bear Trap from a chart in under 5 seconds"},
  {t:"Daily Scanner routine dialed in", d:"Using the Scanner tab's 15-minute routine to build a real premarket watchlist every session"},
  {t:"Risk rules internalized", d:"Can state the $50→$100 rule, ~10% daily max loss, and the 3-consecutive-loss stop from memory"},
  {t:"Beta-phase readiness check passed", d:"10 straight trading days, one A-plus (5/5 pillars, MACD + volume confirmed) setup per day, the whole stretch nets green"},
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
    row.innerHTML = `<input type="checkbox" ${isDone?'checked':''} data-idx="${i}">
      <div><strong style="display:block;font-size:.92rem;">${m.t}</strong><span style="font-size:.83rem;color:var(--muted);">${m.d}</span></div>`;
    root.appendChild(row);
  });
  document.getElementById('ms-progress-label').textContent = `${done} / ${MILESTONES.length} complete`;
  document.getElementById('ms-progress-fill').style.width = (done/MILESTONES.length*100)+'%';
}
document.getElementById('ms-list').addEventListener('change', (e) => {
  if(e.target.matches('input[type="checkbox"]')) toggleMilestone(e.target.dataset.idx, e.target.checked);
});
