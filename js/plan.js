import { state, lsGet, lsSet, persistProgress } from './state.js';
import { initSegmented } from './journal.js';
import { computeStats } from './journal-stats.js';
import { todayStr } from './srs.js';

// ---------- Plan (Trading Plan Worksheet, Pre-Trading Checklist, Trifecta Goals, Risk calculator) ----------
initSegmented('ck-centered');
initSegmented('ck-cycle');

export const TP_FIELD_IDS = {
  strategy:'tp-strategy', priceRange:'tp-pricerange', timeOfDay:'tp-timeofday', volFloat:'tp-volfloat',
  technical:'tp-technical', invalidates:'tp-invalidates', riskSize:'tp-risksize', profitTarget:'tp-profittarget',
  premarket:'tp-premarket', dailyMaxLoss:'tp-dailymaxloss', dailyProfitTarget:'tp-dailyprofittarget',
  goal:'tp-goal', nextStep:'tp-nextstep',
};
document.getElementById('tp-save-btn').addEventListener('click', () => {
  const plan = {};
  Object.keys(TP_FIELD_IDS).forEach(key => { plan[key] = document.getElementById(TP_FIELD_IDS[key]).value.trim(); });
  state.planState = plan;
  persistProgress('tradingplan', plan);
});
// The original sample-trading-plan.pdf this worksheet mirrors was meant to
// be printed and kept at the desk — the app never offered a print path.
// The @media print rules in styles.css strip the sidebar/clock bar/save
// buttons; the SPA already shows only one .page at a time, so nothing
// page-specific is needed here beyond triggering the browser print dialog.
document.getElementById('tp-print-btn').addEventListener('click', () => window.print());
document.getElementById('ck-save-btn').addEventListener('click', () => {
  const checklist = {
    marketStrength: document.getElementById('ck-marketstrength').value.trim(),
    centered: document.getElementById('ck-centered').dataset.value === 'true',
    cycle: document.getElementById('ck-cycle').dataset.value,
    adjust: document.getElementById('ck-adjust').value.trim(),
    obvious: document.getElementById('ck-obvious').value.trim(),
    squeeze: document.getElementById('ck-squeeze').value.trim(),
    date: todayStr(),
  };
  state.checklistState = checklist;
  persistProgress('checklist', checklist);
  renderChecklistStatus();
});

// Account size for the risk calculator is a lightweight per-browser convenience,
// not something that needs cross-device sync — plain localStorage is fine.
document.getElementById('plan-account-size').value = lsGet('tc-account-size', '');
document.getElementById('plan-account-size').addEventListener('input', (e) => {
  lsSet('tc-account-size', e.target.value);
  renderRiskCalc();
});

let planFormFilled = false, checklistFormFilled = false;
function fillPlanForm(){
  if(planFormFilled) return; // don't clobber in-progress typing on a later re-render
  Object.keys(TP_FIELD_IDS).forEach(key => {
    const el = document.getElementById(TP_FIELD_IDS[key]);
    if(state.planState[key] != null) el.value = state.planState[key];
  });
  planFormFilled = true;
}
function fillChecklistForm(){
  if(checklistFormFilled) return;
  if(state.checklistState.marketStrength != null) document.getElementById('ck-marketstrength').value = state.checklistState.marketStrength;
  if(state.checklistState.adjust != null) document.getElementById('ck-adjust').value = state.checklistState.adjust;
  if(state.checklistState.obvious != null) document.getElementById('ck-obvious').value = state.checklistState.obvious;
  if(state.checklistState.squeeze != null) document.getElementById('ck-squeeze').value = state.checklistState.squeeze;
  if(state.checklistState.centered != null){
    const group = document.getElementById('ck-centered');
    const val = state.checklistState.centered ? 'true' : 'false';
    group.dataset.value = val;
    group.querySelectorAll('.seg-btn').forEach(b => b.classList.toggle('active', b.dataset.value === val));
  }
  if(state.checklistState.cycle != null){
    const group = document.getElementById('ck-cycle');
    group.dataset.value = state.checklistState.cycle;
    group.querySelectorAll('.seg-btn').forEach(b => b.classList.toggle('active', b.dataset.value === state.checklistState.cycle));
  }
  checklistFormFilled = true;
}

// The checklist card's own copy says "meant to be re-filled each morning...
// holds only your latest check-in" but nothing enforced or even showed
// that — a trader could see last Tuesday's "obvious stock" answer sitting
// in the form with no indication it's stale, easy to mistake for today's.
// Doesn't clear the form (that risks looking like data loss); just makes
// the staleness visible.
function renderChecklistStatus(){
  const el = document.getElementById('ck-status');
  if(!el) return;
  const saved = state.checklistState.date;
  if(!saved){
    el.textContent = "Not saved yet today — fill this in before you trade.";
    el.className = 'pill bad';
  } else if(saved === todayStr()){
    el.textContent = `Saved today.`;
    el.className = 'pill good';
  } else {
    el.textContent = `Last saved ${saved} — this is stale, re-check before you trade today.`;
    el.className = 'pill bad';
  }
}

// Profit Trifecta Goals — Warrior Trading's progression table, exact figures.
export const TRIFECTA = [
  {tier:'Novice', accMin:0.40, accMax:0.50, plMin:0.5, plMax:1.0},
  {tier:'Beginner', accMin:0.50, accMax:0.60, plMin:1.0, plMax:1.5},
  {tier:'Advanced', accMin:0.60, accMax:0.70, plMin:1.5, plMax:2.0},
  {tier:'Pro', accMin:0.70, accMax:Infinity, plMin:1.0, plMax:Infinity},
];
export function tierFor(value, key){
  if(value == null) return null;
  for(const row of TRIFECTA){ if(value >= row[key+'Min'] && value < row[key+'Max']) return row.tier; }
  return value >= TRIFECTA[TRIFECTA.length-1][key+'Min'] ? 'Pro' : null;
}
export function renderTrifectaCallout(){
  const root = document.getElementById('trifecta-callout');
  if(!root) return;
  const s = computeStats(state.trades);
  const winners = state.trades.filter(t => (t.resultAmount||0) > 0);
  const losers = state.trades.filter(t => (t.resultAmount||0) < 0);
  const avgWin = winners.length ? winners.reduce((sum,t)=>sum+t.resultAmount,0)/winners.length : null;
  const avgLoss = losers.length ? losers.reduce((sum,t)=>sum+t.resultAmount,0)/losers.length : null;
  const plRatio = (avgWin != null && avgLoss) ? avgWin/Math.abs(avgLoss) : null;
  if(!s.total){
    root.innerHTML = `<p style="color:var(--muted);font-size:.86rem;margin:0;">Log some trades to see which tier your accuracy and P/L ratio currently fall into.</p>`;
    return;
  }
  const accTier = tierFor(s.winRate, 'acc');
  const plTier = tierFor(plRatio, 'pl');
  const fmtPct = v => v==null ? '—' : Math.round(v*100)+'%';
  const fmtRatio = v => v==null ? '—' : v.toFixed(2);
  root.innerHTML = `
    <div class="grid cols-2">
      <div class="stat-tile"><div class="k">Your accuracy</div><div class="v">${fmtPct(s.winRate)}</div><div style="margin-top:6px;">${accTier ? `<span class="pill neutral">${accTier} tier</span>` : '<span class="pill">—</span>'}</div></div>
      <div class="stat-tile"><div class="k">Your P/L ratio</div><div class="v">${fmtRatio(plRatio)}</div><div style="margin-top:6px;">${plTier ? `<span class="pill neutral">${plTier} tier</span>` : '<span class="pill">—</span>'}</div></div>
    </div>`;
}

// Risk rules calculator — % of account, per the Trading Plan Worksheet framing.
export function renderRiskCalc(){
  const root = document.getElementById('risk-calc-out');
  if(!root) return;
  const size = parseFloat(document.getElementById('plan-account-size').value);
  if(!size || size <= 0){
    root.innerHTML = `<div class="empty-state" style="padding:16px;grid-column:1/-1;"><div>Enter an account size above to see suggested $ amounts.</div></div>`;
    return;
  }
  const fmtUsd = v => '$'+v.toFixed(2);
  root.innerHTML = `
    <div class="stat-tile"><div class="k">Risk/trade (~5%)</div><div class="v">${fmtUsd(size*0.05)}</div></div>
    <div class="stat-tile"><div class="k">Profit target/trade (~10%)</div><div class="v good">${fmtUsd(size*0.10)}</div></div>
    <div class="stat-tile"><div class="k">Daily max loss (~10%)</div><div class="v bad">-${fmtUsd(size*0.10)}</div></div>`;
}

export function renderPlan(){
  fillPlanForm();
  fillChecklistForm();
  renderChecklistStatus();
  renderTrifectaCallout();
  renderRiskCalc();
}
