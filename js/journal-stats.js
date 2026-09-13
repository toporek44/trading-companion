import { state, escapeHtml } from './state.js';

export function computeStats(list){
  const total = list.length;
  const withR = list.filter(t => typeof t.rMultiple === 'number' && !isNaN(t.rMultiple));
  const wins = list.filter(t => (t.resultAmount||0) > 0).length;
  const winRate = total ? wins/total : 0;
  const avgR = withR.length ? withR.reduce((s,t)=>s+t.rMultiple,0)/withR.length : null;
  const processCount = list.filter(t => t.processFollowed).length;
  const processRate = total ? processCount/total : 0;
  const totalPnl = list.reduce((s,t)=>s+(t.resultAmount||0),0);
  // Expectancy: average $ P&L per trade — the standard trading-journal metric
  // (Tradervue/Edgewonk both surface this), mathematically equal to
  // winRate*avgWin - lossRate*avgLoss but simpler to compute directly.
  const expectancy = total ? totalPnl/total : null;
  // Max drawdown: largest peak-to-trough decline along the same
  // date-sorted cumulative-P&L curve the equity chart plots.
  const sorted = [...list].filter(t=>t.date).sort((a,b)=> a.date.localeCompare(b.date) || (a.createdAt||0)-(b.createdAt||0));
  let cum = 0, peak = 0, maxDrawdown = 0;
  sorted.forEach(t => {
    cum += (t.resultAmount||0);
    if(cum > peak) peak = cum;
    maxDrawdown = Math.min(maxDrawdown, cum - peak);
  });
  // Current streak: consecutive wins/losses counting back from the most
  // recent trade (positive = win streak, negative = loss streak).
  // Breakeven trades (resultAmount === 0) are skipped — they neither
  // extend nor break a streak, matching how Edgewonk/Tradervue treat them.
  let currentStreak = 0;
  for(let i = sorted.length - 1; i >= 0; i--){
    const r = sorted[i].resultAmount || 0;
    if(r === 0) continue;
    const dir = r > 0 ? 1 : -1;
    if(currentStreak === 0) currentStreak = dir;
    else if(Math.sign(currentStreak) === dir) currentStreak += dir;
    else break;
  }
  return {total, winRate, avgR, processRate, totalPnl, expectancy, maxDrawdown: sorted.length ? maxDrawdown : null, currentStreak: sorted.length ? currentStreak : null};
}

export function streakLabel(streak){
  if(streak == null || streak === 0) return '—';
  const n = Math.abs(streak);
  const noun = streak > 0 ? (n === 1 ? 'win' : 'wins') : (n === 1 ? 'loss' : 'losses');
  return `${n} ${noun}`;
}

export function renderJournalStats(){
  const s = computeStats(state.trades);
  const root = document.getElementById('journal-stats');
  const fmtPct = v => v==null ? '—' : Math.round(v*100)+'%';
  const fmtR = v => v==null ? '—' : (v>=0?'+':'')+v.toFixed(2)+'R';
  const fmtUsd = v => v==null ? '—' : (v>=0?'+':'-')+'$'+Math.abs(v).toFixed(2);
  root.innerHTML = `
    <div class="stat-tile"><div class="k">Trades logged</div><div class="v">${s.total}</div></div>
    <div class="stat-tile"><div class="k">Win rate</div><div class="v ${s.winRate>=0.5?'good':(s.total?'bad':'')}">${fmtPct(s.winRate)}</div></div>
    <div class="stat-tile"><div class="k">Avg R-multiple</div><div class="v ${s.avgR>0?'good':(s.avgR<0?'bad':'')}">${fmtR(s.avgR)}</div></div>
    <div class="stat-tile"><div class="k">Process adherence</div><div class="v ${s.processRate>=0.8?'good':''}">${fmtPct(s.processRate)}</div></div>
    <div class="stat-tile"><div class="k">Expectancy / trade</div><div class="v ${s.expectancy>0?'good':(s.expectancy<0?'bad':'')}">${fmtUsd(s.expectancy)}</div></div>
    <div class="stat-tile"><div class="k">Max drawdown</div><div class="v ${s.maxDrawdown<0?'bad':''}">${s.maxDrawdown==null?'—':'-$'+Math.abs(s.maxDrawdown).toFixed(2)}</div></div>
    <div class="stat-tile"><div class="k">Current streak</div><div class="v ${s.currentStreak>0?'good':(s.currentStreak<0?'bad':'')}">${streakLabel(s.currentStreak)}</div></div>`;
}

// ---------- R-multiple distribution (Edgewonk-style outcome-clustering histogram) ----------
const R_BUCKETS = [
  { label: '< -2R', test: r => r < -2 },
  { label: '-2R to -1R', test: r => r >= -2 && r < -1 },
  { label: '-1R to 0R', test: r => r >= -1 && r < 0 },
  { label: '0R to 1R', test: r => r >= 0 && r < 1 },
  { label: '1R to 2R', test: r => r >= 1 && r < 2 },
  { label: '2R to 3R', test: r => r >= 2 && r < 3 },
  { label: '> 3R', test: r => r >= 3 },
];
export function renderRHistogram(){
  const root = document.getElementById('r-histogram');
  if(!root) return;
  const withR = state.trades.filter(t => typeof t.rMultiple === 'number' && !isNaN(t.rMultiple));
  if(withR.length === 0){
    root.innerHTML = `<div class="empty-state" style="padding:16px;"><div>Log trades with an R-multiple to see how your outcomes cluster.</div></div>`;
    return;
  }
  const counts = R_BUCKETS.map(b => withR.filter(t => b.test(t.rMultiple)).length);
  const maxCount = Math.max(...counts, 1);
  root.innerHTML = `<div style="display:flex;align-items:flex-end;gap:8px;height:120px;">
    ${R_BUCKETS.map((b, i) => {
      const isLoss = b.label.trim().startsWith('-') || b.label.trim().startsWith('<');
      const heightPct = counts[i] ? Math.max(6, (counts[i]/maxCount)*100) : 0;
      return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;">
        <div class="mono" style="font-size:.72rem;color:var(--muted);margin-bottom:4px;">${counts[i]||''}</div>
        <div style="width:100%;height:${heightPct}%;border-radius:4px 4px 0 0;background:${isLoss?'var(--bad)':'var(--good)'};opacity:${counts[i]?0.85:0};"></div>
      </div>`;
    }).join('')}
  </div>
  <div style="display:flex;gap:8px;margin-top:6px;">
    ${R_BUCKETS.map(b => `<div style="flex:1;text-align:center;font-size:.68rem;color:var(--muted);">${b.label}</div>`).join('')}
  </div>`;
}

// ---------- Trade Coach (rule-based insights from real journal/plan data) ----------
export function parsePercent(str){
  if(!str) return null;
  const m = String(str).match(/(\d+(?:\.\d+)?)\s*%/);
  return m ? parseFloat(m[1]) : null;
}
export function groupsByStrategy(list){
  const groups = {};
  list.forEach(t => { const k = t.strategy; if(!k) return; (groups[k] = groups[k]||[]).push(t); });
  return groups;
}
export function groupsByTagFlat(list){
  const groups = {};
  list.forEach(t => {
    (t.tags||'').split(',').map(s=>s.trim()).filter(Boolean).forEach(tag => { (groups[tag] = groups[tag]||[]).push(t); });
  });
  return groups;
}
export function buildCoachInsights(list, plan){
  const trades = list || [];
  const fmtUsd = v => (v>=0?'+$':'-$')+Math.abs(v).toFixed(2);
  if(trades.length < 5){
    return [{type:'tip', text:'Log a few more trades — insights need at least 5 to say anything reliable.'}];
  }
  const insights = [];

  // 1. Pillars discipline over the most recent trades that actually carry pillar data
  const withPillars = trades.filter(t => typeof t.pillarsCount === 'number').slice(0, 10);
  if(withPillars.length >= 5){
    const low = withPillars.filter(t => t.pillarsCount <= 2).length;
    const frac = low / withPillars.length;
    if(frac > 0.4){
      insights.push({type:'watchout', text:`${low} of your last ${withPillars.length} trades scored 2/5 pillars or lower — you're trading outside your own setup criteria ${frac>=0.5?'more than half':'a lot of'} the time.`});
    }
  }

  // 2. Entries outside the plan's stated stock price range
  if(plan && plan.priceRange){
    const nums = String(plan.priceRange).match(/\d+(?:\.\d+)?/g);
    if(nums && nums.length >= 2){
      const lo = parseFloat(nums[0]), hi = parseFloat(nums[1]);
      if(hi > lo){
        const priced = trades.filter(t => typeof t.entryPrice === 'number' && !isNaN(t.entryPrice));
        if(priced.length >= 5){
          const outside = priced.filter(t => t.entryPrice < lo || t.entryPrice > hi).length;
          const frac = outside / priced.length;
          if(frac > 0.3){
            insights.push({type:'watchout', text:`${outside} of ${priced.length} priced trades fell outside your plan's stock price range (${plan.priceRange}) — ${Math.round(frac*100)}% of the time you're sizing up names your own plan rules out.`});
          }
        }
      }
    }
  }

  // 3. Actual win rate vs. what the plan's stated risk/reward requires to break even
  const riskPct = parsePercent(plan && plan.riskSize);
  const targetPct = parsePercent(plan && plan.profitTarget);
  if(riskPct > 0 && targetPct > 0){
    const rr = targetPct / riskPct;
    const breakeven = 1 / (1 + rr);
    const stats = computeStats(trades);
    if(stats.winRate < breakeven - 0.05){
      insights.push({type:'watchout', text:`Your plan's ${plan.profitTarget} target against ${plan.riskSize} risk implies roughly a ${rr.toFixed(1)}:1 reward:risk, needing about ${Math.round(breakeven*100)}% win rate to break even — your actual win rate is ${Math.round(stats.winRate*100)}%.`});
    }
  }

  // 4. Active losing streak where process wasn't consistently followed
  {
    let streak = 0, brokeProcess = false;
    for(const t of trades){
      if((t.resultAmount||0) < 0){
        streak++;
        if(!t.processFollowed) brokeProcess = true;
      } else break;
    }
    if(streak >= 3 && brokeProcess){
      insights.push({type:'tip', text:`You're on a ${streak}-trade losing streak that includes trades where process wasn't followed — Rule 3 says three losers in a row ends the trading day. Worth sitting out until tomorrow.`});
    }
  }

  // 5. Worst and best strategy/tag by total P&L (min 3 trades each)
  {
    const candidates = [];
    const byStrat = groupsByStrategy(trades);
    Object.keys(byStrat).forEach(k => { if(k !== 'Other') candidates.push({label:k, kind:'strategy', list:byStrat[k]}); });
    const byTag = groupsByTagFlat(trades);
    Object.keys(byTag).forEach(k => candidates.push({label:k, kind:'tag', list:byTag[k]}));
    const scored = candidates.filter(c => c.list.length >= 3).map(c => ({...c, s: computeStats(c.list)}));

    const worst = scored.filter(c => c.s.totalPnl < 0).sort((a,b) => a.s.totalPnl - b.s.totalPnl)[0];
    if(worst){
      const isRevenge = worst.kind === 'tag' && /revenge/i.test(worst.label);
      const name = worst.kind === 'tag' ? `'${worst.label}'-tagged` : `your '${worst.label}'`;
      const extra = isRevenge ? ' — consider a hard rule against re-entering within a set cool-down window after a loss.' : ' — worth a hard look before taking that setup again.';
      insights.push({type:'watchout', text:`${name} trades are down ${fmtUsd(worst.s.totalPnl)} across ${worst.list.length} trades${extra}`});
    }

    const best = scored.filter(c => c.s.totalPnl > 0).sort((a,b) => b.s.totalPnl - a.s.totalPnl)[0];
    if(best){
      const name = best.kind === 'tag' ? `'${best.label}'-tagged` : `your '${best.label}'`;
      insights.push({type:'strength', text:`${name} trades are up ${fmtUsd(best.s.totalPnl)} across ${best.list.length} trades — a genuine edge worth leaning into.`});
    }
  }

  // 6. General process-adherence strength
  {
    const stats = computeStats(trades);
    if(stats.processRate >= 0.8){
      insights.push({type:'strength', text:`You followed your process on ${Math.round(stats.processRate*100)}% of trades — that discipline is exactly what turns a plan into results.`});
    }
  }

  const watchouts = insights.filter(i => i.type === 'watchout');
  const rest = insights.filter(i => i.type !== 'watchout');
  return [...watchouts, ...rest].slice(0, 6);
}
export function coachInsightMeta(type){
  if(type === 'watchout') return {cls:'bad', label:'watch out'};
  if(type === 'strength') return {cls:'good', label:'strength'};
  return {cls:'neutral', label:'tip'};
}
export function renderCoachRules(){
  const root = document.getElementById('coach-rules');
  if(!root) return;
  const insights = buildCoachInsights(state.trades, state.planState);
  root.innerHTML = insights.map((i, idx) => {
    const meta = coachInsightMeta(i.type);
    const border = idx < insights.length - 1 ? 'border-bottom:1px solid var(--line);' : '';
    return `<div style="display:flex;align-items:flex-start;gap:10px;padding:7px 0;${border}">
      <span class="pill ${meta.cls}" style="flex-shrink:0;white-space:nowrap;">${meta.label}</span>
      <span style="font-size:.88rem;line-height:1.4;">${escapeHtml(i.text)}</span>
    </div>`;
  }).join('');
}

// ---------- Performance breakdowns (by strategy / by tag) ----------
export function statsTableHtml(groups){
  const rows = Object.keys(groups).map(key => {
    const list = groups[key];
    const s = computeStats(list);
    return {key, s};
  }).sort((a,b) => b.s.totalPnl - a.s.totalPnl);
  if(rows.length === 0){
    return `<div class="empty-state" style="padding:16px;"><div>Not enough trades yet.</div></div>`;
  }
  const fmtPct = v => v==null ? '—' : Math.round(v*100)+'%';
  const fmtR = v => v==null ? '—' : (v>=0?'+':'')+v.toFixed(2)+'R';
  const fmtUsd = v => (v>=0?'+$':'-$')+Math.abs(v).toFixed(2);
  return `<table style="min-width:0;"><thead><tr><th>Name</th><th>#</th><th>Win%</th><th>Avg R</th><th>Total P&amp;L</th></tr></thead><tbody>
    ${rows.map(r => `<tr>
      <td>${escapeHtml(r.key)}</td>
      <td class="num">${r.s.total}</td>
      <td class="num">${fmtPct(r.s.winRate)}</td>
      <td class="num">${fmtR(r.s.avgR)}</td>
      <td class="num ${r.s.totalPnl>0?'good':(r.s.totalPnl<0?'bad':'')}">${fmtUsd(r.s.totalPnl)}</td>
    </tr>`).join('')}
  </tbody></table>`;
}
export function renderStatsByStrategy(){
  const groups = {};
  state.trades.forEach(t => { const k = t.strategy || 'Other'; (groups[k] = groups[k]||[]).push(t); });
  document.getElementById('stats-by-strategy').innerHTML = statsTableHtml(groups);
}
export function renderStatsByTag(){
  const groups = {};
  state.trades.forEach(t => {
    const tags = (t.tags||'').split(',').map(s=>s.trim()).filter(Boolean);
    if(tags.length === 0){ (groups['(untagged)'] = groups['(untagged)']||[]).push(t); }
    tags.forEach(tag => { (groups[tag] = groups[tag]||[]).push(t); });
  });
  document.getElementById('stats-by-tag').innerHTML = statsTableHtml(groups);
}

// ---------- Monthly P&L calendar heatmap ----------
let heatmapMonth = new Date(); heatmapMonth.setDate(1);
export function renderPnlHeatmap(){
  const y = heatmapMonth.getFullYear(), m = heatmapMonth.getMonth();
  document.getElementById('heatmap-label').textContent = heatmapMonth.toLocaleDateString(undefined, {month:'long', year:'numeric'});
  const byDay = {};
  state.trades.forEach(t => {
    if(!t.date) return;
    const d = new Date(t.date+'T00:00:00');
    if(d.getFullYear()===y && d.getMonth()===m){
      byDay[t.date] = (byDay[t.date]||0) + (t.resultAmount||0);
    }
  });
  const vals = Object.values(byDay).map(Math.abs);
  const maxAbs = vals.length ? Math.max(...vals) : 1;
  const firstDow = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m+1, 0).getDate();
  let cells = '';
  for(let i=0;i<firstDow;i++) cells += `<div></div>`;
  for(let day=1; day<=daysInMonth; day++){
    const dateStr = `${y}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const pnl = byDay[dateStr];
    let bg = 'var(--surface-2)', color = 'var(--muted)';
    if(pnl != null && pnl !== 0){
      const intensity = Math.min(1, Math.abs(pnl)/maxAbs);
      if(pnl > 0){ bg = `color-mix(in srgb, var(--good) ${20+intensity*60}%, var(--surface-2))`; color = 'var(--ink)'; }
      else { bg = `color-mix(in srgb, var(--bad) ${20+intensity*60}%, var(--surface-2))`; color = 'var(--ink)'; }
    }
    cells += `<div style="aspect-ratio:1;border-radius:8px;background:${bg};color:${color};display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:.72rem;border:1px solid var(--line);">
      <span class="mono" style="font-size:.65rem;opacity:.7;">${day}</span>
      ${pnl!=null ? `<span class="mono" style="font-weight:600;">${(pnl>=0?'+':'')}${Math.round(pnl)}</span>` : ''}
    </div>`;
  }
  document.getElementById('pnl-heatmap').innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-bottom:6px;">
      ${['S','M','T','W','T','F','S'].map(d=>`<div class="mono" style="text-align:center;font-size:.7rem;color:var(--muted);">${d}</div>`).join('')}
    </div>
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;">${cells}</div>`;
}
document.getElementById('heatmap-prev').addEventListener('click', () => { heatmapMonth.setMonth(heatmapMonth.getMonth()-1); renderPnlHeatmap(); });
document.getElementById('heatmap-next').addEventListener('click', () => { heatmapMonth.setMonth(heatmapMonth.getMonth()+1); renderPnlHeatmap(); });

export function renderEquityChart(){
  const root = document.getElementById('equity-chart');
  const list = [...state.trades].filter(t=>t.date).sort((a,b)=> a.date.localeCompare(b.date) || (a.createdAt||0)-(b.createdAt||0));
  if(list.length < 2){
    root.innerHTML = `<div class="empty-state" style="padding:20px;">
      <div class="icon-wrap"><svg class="icon" viewBox="0 0 24 24"><path d="M4 19h16M4 19V5M4 15l4-5 4 3 5-7"/></svg></div>
      <div>Log at least 2 trades to see your equity curve.</div></div>`;
    return;
  }
  let cum = 0;
  const pts = list.map(t => (cum += (t.resultAmount||0)));
  const w = 820, h = 180, pad = 34;
  const minV = Math.min(0, ...pts), maxV = Math.max(0, ...pts);
  const range = (maxV - minV) || 1;
  const x = i => pad + (i/(pts.length-1)) * (w - pad*2);
  const y = v => h - pad - ((v - minV)/range) * (h - pad*2);
  const zeroY = y(0);
  const path = pts.map((v,i) => `${i===0?'M':'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const last = pts[pts.length-1];
  const lineColor = last >= 0 ? 'var(--good)' : 'var(--bad)';
  root.innerHTML = `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto;font-family:'IBM Plex Mono',monospace;">
    <line x1="${pad}" y1="${zeroY}" x2="${w-pad}" y2="${zeroY}" stroke="var(--line)" stroke-width="1" />
    <text x="${pad}" y="${zeroY-6}" font-size="10" fill="var(--muted)">$0</text>
    <text x="${w-pad}" y="16" font-size="10" fill="var(--muted)" text-anchor="end">max ${maxV.toFixed(0)}</text>
    <text x="${w-pad}" y="${h-8}" font-size="10" fill="var(--muted)" text-anchor="end">min ${minV.toFixed(0)}</text>
    <path d="${path}" fill="none" stroke="${lineColor}" stroke-width="2" />
    <circle cx="${x(pts.length-1)}" cy="${y(last)}" r="3.5" fill="${lineColor}" />
    <text x="${x(pts.length-1)}" y="${y(last)-8}" font-size="11" fill="${lineColor}" text-anchor="end">${last>=0?'+':''}$${last.toFixed(2)}</text>
  </svg>`;
}

// ---------- Weekly performance report (mirrors the Warrior Trading weekly reporting sheet) ----------
export function renderWeeklyReport(){
  const root = document.getElementById('weekly-report');
  if(!root) return;
  const now = new Date();
  const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6); // last 7 days incl. today
  const inWindow = state.trades.filter(t => {
    if(!t.date) return false;
    const d = new Date(t.date+'T00:00:00');
    return d >= cutoff;
  });
  if(inWindow.length === 0){
    root.innerHTML = `<div class="empty-state" style="padding:16px;"><div>No trades in the last 7 days yet.</div></div>`;
    return;
  }
  const winners = inWindow.filter(t => (t.resultAmount||0) > 0);
  const losers = inWindow.filter(t => (t.resultAmount||0) < 0);
  const avg = (list, fn) => list.length ? list.reduce((s,t)=>s+fn(t),0)/list.length : null;
  const centsPerShare = t => (t.size && t.size > 0) ? (t.resultAmount/t.size)*100 : null;
  const avgWinners = avg(winners, t => t.resultAmount);
  const winnersWithSize = winners.filter(t => t.size && t.size > 0);
  const avgWinnerCents = winnersWithSize.length ? avg(winnersWithSize, centsPerShare) : null;
  const avgLosers = avg(losers, t => t.resultAmount);
  const losersWithSize = losers.filter(t => t.size && t.size > 0);
  const avgLoserCents = losersWithSize.length ? avg(losersWithSize, centsPerShare) : null;
  const accuracy = inWindow.length ? winners.length/inWindow.length : null;
  const totalPnl = inWindow.reduce((s,t)=>s+(t.resultAmount||0),0);
  const fmtUsd = v => v==null ? '—' : (v>=0?'+$':'-$')+Math.abs(v).toFixed(2);
  const fmtCents = v => v==null ? '—' : (v>=0?'+':'')+v.toFixed(1)+'¢';
  const fmtPct = v => v==null ? '—' : Math.round(v*100)+'%';
  root.innerHTML = `
    <div class="grid cols-4">
      <div class="stat-tile"><div class="k">Avg winners ($)</div><div class="v good">${fmtUsd(avgWinners)}</div></div>
      <div class="stat-tile"><div class="k">Avg winner (¢/sh)</div><div class="v good">${fmtCents(avgWinnerCents)}</div></div>
      <div class="stat-tile"><div class="k">Avg losers ($)</div><div class="v bad">${fmtUsd(avgLosers)}</div></div>
      <div class="stat-tile"><div class="k">Avg loser (¢/sh)</div><div class="v bad">${fmtCents(avgLoserCents)}</div></div>
    </div>
    <div class="grid cols-2" style="margin-top:12px;">
      <div class="stat-tile"><div class="k">Total accuracy</div><div class="v ${accuracy>=0.5?'good':'bad'}">${fmtPct(accuracy)}</div></div>
      <div class="stat-tile"><div class="k">Total P&amp;L (7d)</div><div class="v ${totalPnl>=0?'good':'bad'}">${fmtUsd(totalPnl)}</div></div>
    </div>`;
}
