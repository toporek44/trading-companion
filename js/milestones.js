import { state, persistProgress } from './state.js';
import { renderAll } from './app.js';

export const MILESTONES = [
  {t:"Set up TradingView workspace", d:"Layouts, watchlists, screener, paper trading panel configured"},
  {t:"Can read candlesticks & place all order types", d:"Market, limit, stop, stop-limit — without hesitating"},
  {t:"Trading journal in active use", d:"Logging entries here in the Journal tab consistently"},
  {t:"20 futures paper trades logged", d:"VWAP/trend or Market Profile strategy, one position at a time"},
  {t:"40+ futures paper trades, expectancy checked", d:"Reviewed last 30+ trades for positive/breakeven expectancy"},
  {t:"Options vocabulary solid", d:"Can explain strike, premium, delta, theta, vega, IV rank unprompted"},
  {t:"20 options paper trades logged", d:"thinkorswim paperMoney, risk rules intact"},
  {t:"Risk framework internalized", d:"Can state your 1-2% rule, daily limit, weekly circuit breaker from memory"},
  {t:"Beta-phase readiness check passed", d:"10 straight trading days, one A-plus (5/5 pillars) setup per day, the whole stretch nets green"},
  {t:"First live futures trade placed", d:"$1,000 account, 1% max risk, full journal entry"},
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
