import { state, initData } from './state.js';
import './nav.js';
import './market-clock.js';
import { renderCalendar } from './calendar.js';
import { renderMilestones } from './milestones.js';
import './journal.js';
import { renderTradesTable } from './journal.js';
import { renderJournalStats, renderEquityChart, renderStatsByStrategy, renderStatsByTag, renderCoachRules, renderWeeklyReport, renderPnlHeatmap } from './journal-stats.js';
import { renderPlan } from './plan.js';
import { renderLessons } from './lessons.js';
import { renderPractice } from './practice.js';
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
  renderJournalStats();
  renderEquityChart();
  renderStatsByStrategy();
  renderStatsByTag();
  renderCoachRules();
  renderWeeklyReport();
  renderPnlHeatmap();
  renderTradesTable();
  renderPlan();
  renderLessons();
  renderPractice();
  renderDashboard();
}

initData(renderAll);
