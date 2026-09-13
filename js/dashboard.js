import { state } from './state.js';
import { computeStats, streakLabel } from './journal-stats.js';
import { WEEKS, TOTAL_DAYS, findTodayKey } from './calendar.js';
import { MILESTONES } from './milestones.js';
import { renderBrief } from './brief.js';

// ---------- Dashboard ----------
export function renderDashboard(){
  const totalDoneDays = Object.values(state.calState).filter(Boolean).length;
  const doneMs = Object.values(state.msState).filter(Boolean).length;
  const s = computeStats(state.trades);
  const fmtPct = v => v==null ? '—' : Math.round(v*100)+'%';
  const fmtR = v => v==null ? '—' : (v>=0?'+':'')+v.toFixed(2)+'R';
  const fmtUsd = v => v==null ? '—' : (v>=0?'+':'-')+'$'+Math.abs(v).toFixed(2);

  document.getElementById('dash-stats').innerHTML = `
    <div class="stat-tile"><div class="k">Day</div><div class="v">${Math.min(totalDoneDays+1, TOTAL_DAYS)}<span style="font-size:.9rem;color:var(--muted);">/${TOTAL_DAYS}</span></div></div>
    <div class="stat-tile"><div class="k">Trades logged</div><div class="v">${s.total}</div></div>
    <div class="stat-tile"><div class="k">Win rate</div><div class="v ${s.total? (s.winRate>=0.5?'good':'bad'):''}">${fmtPct(s.winRate)}</div></div>
    <div class="stat-tile"><div class="k">Avg R</div><div class="v ${s.avgR>0?'good':(s.avgR<0?'bad':'')}">${fmtR(s.avgR)}</div></div>
    <div class="stat-tile"><div class="k">Expectancy / trade</div><div class="v ${s.expectancy>0?'good':(s.expectancy<0?'bad':'')}">${fmtUsd(s.expectancy)}</div></div>
    <div class="stat-tile"><div class="k">Current streak</div><div class="v ${s.currentStreak>0?'good':(s.currentStreak<0?'bad':'')}">${streakLabel(s.currentStreak)}</div></div>`;

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
      <button class="btn" style="margin-top:12px;" onclick="document.querySelector('[data-page=calendar]').click()">Open calendar</button>`;
  }

  document.getElementById('dash-cal-label').textContent = `Day-by-day calendar: ${totalDoneDays} / ${TOTAL_DAYS}`;
  document.getElementById('dash-cal-fill').style.width = (totalDoneDays/TOTAL_DAYS*100)+'%';
  document.getElementById('dash-ms-label').textContent = `Milestones: ${doneMs} / ${MILESTONES.length}`;
  document.getElementById('dash-ms-fill').style.width = (doneMs/MILESTONES.length*100)+'%';

  renderBrief();
}
