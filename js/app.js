import { state, initData } from './state.js';
import './nav.js';
import './market-clock.js';
import './theme-toggle.js';
import { renderCalendar } from './calendar.js';
import { renderMilestones } from './milestones.js';
import './journal.js';
import './journal-shortcuts.js';
import { renderTradesTable } from './journal.js';
import { renderJournalStats, renderEquityChart, renderRHistogram, renderStatsByStrategy, renderStatsByTag, renderStatsByWeekday, renderCoachRules, renderWeeklyReport, renderPnlHeatmap, renderCircuitBreaker, renderTodayPnlBadge } from './journal-stats.js';
import { renderPlan } from './plan.js';
import { renderLessons } from './lessons.js';
import { renderPractice } from './practice.js';
import { renderGlossaryPage } from './glossary.js';
import './scanner.js';
import './futures-scanner.js';
import './crypto-scanner.js';
import './scanner-shortcuts.js';
import { renderDashboard } from './dashboard.js';
import './brief.js';

export function renderAll(){
  if(!(state.calLoaded && state.msLoaded && state.tradesLoaded && state.briefsLoaded && state.planLoaded && state.checklistLoaded && state.lessonsLoaded && state.srsLoaded)) return;
  renderCalendar();
  renderMilestones();
  renderCircuitBreaker();
  renderTodayPnlBadge();
  renderJournalStats();
  renderEquityChart();
  renderRHistogram();
  renderStatsByStrategy();
  renderStatsByTag();
  renderStatsByWeekday();
  renderCoachRules();
  renderWeeklyReport();
  renderPnlHeatmap();
  renderTradesTable();
  renderPlan();
  renderLessons();
  renderPractice();
  renderGlossaryPage();
  renderDashboard();
}

initData(renderAll);

// PWA installability (add-to-home-screen, standalone window). sw.js is
// deliberately a no-op — this app's whole value is live data, so it must
// never risk serving a cached/stale API response.
if('serviceWorker' in navigator){
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
