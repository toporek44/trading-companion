import { state, statTileCls, escapeHtml } from './state.js';
import { computeStats, streakLabel, buildCoachInsights, coachInsightMeta, renderCircuitBreaker } from './journal-stats.js';
import { WEEKS, TOTAL_DAYS, findTodayKey, toggleCalDay } from './calendar.js';
import { MILESTONES } from './milestones.js';
import { renderBrief } from './brief.js';

// ---------- Dashboard ----------
export function renderDashboard(){
  renderCircuitBreaker('dash-circuit-breaker');
  const totalDoneDays = Object.values(state.calState).filter(Boolean).length;
  const doneMs = Object.values(state.msState).filter(Boolean).length;
  const s = computeStats(state.trades);
  const fmtPct = v => v==null ? '—' : Math.round(v*100)+'%';
  const fmtR = v => v==null ? '—' : (v>=0?'+':'')+v.toFixed(2)+'R';
  const fmtUsd = v => v==null ? '—' : (v>=0?'+':'-')+'$'+Math.abs(v).toFixed(2);

  const winRateCls = s.total ? (s.winRate>=0.5?'good':'bad') : '';
  const avgRCls = s.avgR>0?'good':(s.avgR<0?'bad':'');
  const expectancyCls = s.expectancy>0?'good':(s.expectancy<0?'bad':'');
  const streakCls = s.currentStreak>0?'good':(s.currentStreak<0?'bad':'');
  document.getElementById('dash-stats').innerHTML = `
    <div class="stat-tile"><div class="k">Day</div><div class="v serif-num">${Math.min(totalDoneDays+1, TOTAL_DAYS)}<span style="font-size:.9rem;color:var(--muted);">/${TOTAL_DAYS}</span></div></div>
    <div class="stat-tile"><div class="k">Trades logged</div><div class="v">${s.total}</div></div>
    <div class="stat-tile ${statTileCls(winRateCls)}"><div class="k">Win rate</div><div class="v ${winRateCls}">${fmtPct(s.winRate)}</div></div>
    <div class="stat-tile ${statTileCls(avgRCls)}"><div class="k">Avg R</div><div class="v ${avgRCls}">${fmtR(s.avgR)}</div></div>
    <div class="stat-tile ${statTileCls(expectancyCls)}"><div class="k">Expectancy / trade</div><div class="v ${expectancyCls}">${fmtUsd(s.expectancy)}</div></div>
    <div class="stat-tile ${statTileCls(streakCls)}"><div class="k">Current streak</div><div class="v ${streakCls}">${streakLabel(s.currentStreak)}</div></div>`;

  const todayKey = findTodayKey();
  const todayEl = document.getElementById('dash-today');
  if(!todayKey){
    todayEl.innerHTML = `<p style="color:var(--good);font-size:.92rem;margin:0;">All ${TOTAL_DAYS} days checked off — repeat the Week 9–12 rhythm until your exit criteria are genuinely met.</p>`;
  } else {
    const dayNum = WEEKS.slice(0, todayKey.wi).reduce((n,w)=>n+w.days.length,0) + todayKey.di + 1;
    const [learn, practice] = WEEKS[todayKey.wi].days[todayKey.di];
    todayEl.innerHTML = `
      <div class="mono" style="font-size:.8rem;color:var(--accent);margin-bottom:8px;">DAY ${dayNum} &middot; WEEK ${todayKey.wi+1}: ${WEEKS[todayKey.wi].theme}</div>
      <div style="margin-bottom:8px;"><span class="k mono" style="font-size:10px;text-transform:uppercase;color:var(--muted);">Learn (1hr)</span><div style="font-size:.9rem;">${learn}</div></div>
      <div><span class="k mono" style="font-size:10px;text-transform:uppercase;color:var(--muted);">Practice (1hr)</span><div style="font-size:.9rem;">${practice}</div></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;">
        <button class="btn primary" onclick="window.__markTodayDone()">&#10003; Mark today done</button>
        <button class="btn" onclick="document.querySelector('[data-page=calendar]').click()">Open calendar</button>
      </div>`;
  }

  document.getElementById('dash-cal-label').textContent = `Day-by-day calendar: ${totalDoneDays} / ${TOTAL_DAYS}`;
  document.getElementById('dash-cal-fill').style.width = (totalDoneDays/TOTAL_DAYS*100)+'%';
  document.getElementById('dash-ms-label').textContent = `Milestones: ${doneMs} / ${MILESTONES.length}`;
  document.getElementById('dash-ms-fill').style.width = (doneMs/MILESTONES.length*100)+'%';

  const coachCard = document.getElementById('dash-coach-card');
  // Same 5-trade minimum buildCoachInsights itself uses before it has
  // anything real to say (below that it just returns a single "log more
  // trades" placeholder) — showing that placeholder on the Dashboard
  // would be noise, not insight, so the card stays hidden until there's
  // an actual watchout/strength/tip to surface.
  if(state.trades.length >= 5){
    const insights = buildCoachInsights(state.trades, state.planState);
    const top = insights[0];
    const meta = coachInsightMeta(top.type);
    coachCard.hidden = false;
    document.getElementById('dash-coach').innerHTML = `
      <div style="display:flex;align-items:flex-start;gap:10px;">
        <span class="pill ${meta.cls}" style="flex-shrink:0;white-space:nowrap;">${meta.label}</span>
        <span style="font-size:.9rem;line-height:1.4;">${escapeHtml(top.text)}</span>
      </div>
      <button class="btn" style="margin-top:12px;" onclick="document.querySelector('[data-page=journal]').click()">See all insights</button>`;
  } else {
    coachCard.hidden = true;
  }

  renderBrief();
}

// Lets a user complete today's calendar checkbox without leaving the
// Dashboard — previously "Open calendar" was the only path, an extra
// navigation + scroll-to-find-today's-row for what's otherwise a single
// click. Reuses calendar.js's own toggleCalDay so this writes through the
// exact same Supabase persistProgress('calendar', ...) path the Calendar
// tab's own checkboxes use — no separate/duplicated persistence logic.
window.__markTodayDone = function(){
  const todayKey = findTodayKey();
  if(!todayKey) return;
  toggleCalDay(`${todayKey.wi}-${todayKey.di}`, true);
};
