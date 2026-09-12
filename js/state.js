// ---------- Data wiring (Supabase, with a localStorage fallback) ----------
// This standalone deploy has no window.claude, so it uses Supabase directly
// for cross-device sync (mirrors the claude.ai artifact's db capability:
// a "calendar" + "milestones" row in `progress`, plus `trades` and `briefs`
// tables). If Supabase can't be reached, it falls back to localStorage so
// the app still works, just single-browser.
export const SUPABASE_URL = "https://wcqickazhkxgyofyqnxq.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjcWlja2F6aGt4Z3lvZnlxbnhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5Njc4MjUsImV4cCI6MjEwNDU0MzgyNX0.6o4MmgXZTfuXrvK5sEXYUUJk_wYY64xgE-PnE6IxcVc";

export const state = {
  sb: null,
  sample: null,
  calState: {}, msState: {}, trades: [], briefs: [],
  calLoaded: false, msLoaded: false, tradesLoaded: false, briefsLoaded: false,
  planState: {}, checklistState: {},
  planLoaded: false, checklistLoaded: false,
  lessonsState: {},
  lessonsLoaded: false,
};

export function lsGet(key, fallback){
  try{ const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }catch(e){ return fallback; }
}
export function lsSet(key, value){
  try{ localStorage.setItem(key, JSON.stringify(value)); }catch(e){}
}

export const statusEl = document.getElementById('conn-status');

export function tradeFromRow(r){
  return {
    id: r.id, date: r.date, market: r.market, instrument: r.instrument, strategy: r.strategy,
    direction: r.direction, entryPrice: r.entry_price, stopPrice: r.stop_price, exitPrice: r.exit_price,
    size: r.size, riskAmount: r.risk_amount, resultAmount: r.result_amount, rMultiple: r.r_multiple,
    processFollowed: r.process_followed, notes: r.notes, source: r.source || 'manual', tags: r.tags || '',
    pctGainOnDay: r.pct_gain_on_day, relVolume: r.rel_volume, float: r.float, newsCatalyst: r.news_catalyst,
    timeframe: r.timeframe || '', pattern: r.pattern || '', holdTime: r.hold_time, holdUnit: r.hold_unit || '',
    meetsPillars: r.meets_pillars, pillarsCount: r.pillars_count,
    createdAt: r.created_at ? new Date(r.created_at).getTime() : null,
  };
}
export function briefFromRow(r){
  return { id: r.id, date: r.date, text: r.text };
}

export function localOnlyMode(renderAll){
  statusEl.textContent = 'local-only (this browser)';
  state.calState = lsGet('tc-calendar', {});
  state.msState = lsGet('tc-milestones', {});
  state.trades = lsGet('tc-trades', []);
  state.briefs = lsGet('tc-briefs', []);
  state.planState = lsGet('tc-tradingplan', {});
  state.checklistState = lsGet('tc-checklist', {});
  state.lessonsState = lsGet('tc-lessons', {});
  state.calLoaded = state.msLoaded = state.tradesLoaded = state.briefsLoaded = state.planLoaded = state.checklistLoaded = state.lessonsLoaded = true;
  renderAll();
}

// Generic progress-row persist: upsert into Supabase's `progress` table when
// connected, otherwise fall back to localStorage under the same key prefix
// ("calendar" -> tc-calendar, "tradingplan" -> tc-tradingplan, etc).
export async function persistProgress(key, value){
  if(state.sb){ try{ await state.sb.from('progress').upsert({key, state: value, updated_at: new Date().toISOString()}); }catch(e){} }
  else lsSet('tc-'+key, value);
}

export async function refetchTrades(){
  const {data} = await state.sb.from('trades').select('*').order('date', {ascending:false}).limit(500);
  state.trades = (data||[]).map(tradeFromRow);
}

export async function initData(renderAll){
  if(typeof window.supabase === 'undefined'){ localOnlyMode(renderAll); return; }
  try{
    state.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const [progressRes, tradesRes, briefsRes] = await Promise.all([
      state.sb.from('progress').select('key,state'),
      state.sb.from('trades').select('*').order('date', {ascending:false}).limit(500),
      state.sb.from('briefs').select('*').order('created_at', {ascending:false}).limit(10),
    ]);
    if(progressRes.error || tradesRes.error || briefsRes.error) throw (progressRes.error || tradesRes.error || briefsRes.error);

    (progressRes.data||[]).forEach(row => {
      if(row.key === 'calendar') state.calState = row.state || {};
      if(row.key === 'milestones') state.msState = row.state || {};
      if(row.key === 'tradingplan') state.planState = row.state || {};
      if(row.key === 'checklist') state.checklistState = row.state || {};
      if(row.key === 'lessons') state.lessonsState = row.state || {};
    });
    state.trades = (tradesRes.data||[]).map(tradeFromRow);
    state.briefs = (briefsRes.data||[]).map(briefFromRow);
    state.calLoaded = state.msLoaded = state.tradesLoaded = state.briefsLoaded = state.planLoaded = state.checklistLoaded = state.lessonsLoaded = true;
    statusEl.textContent = 'synced';
    renderAll();

    state.sb.channel('progress-changes').on('postgres_changes', {event:'*', schema:'public', table:'progress'}, payload => {
      const row = payload.new && Object.keys(payload.new).length ? payload.new : payload.old;
      if(!row) return;
      if(row.key === 'calendar') state.calState = (payload.eventType === 'DELETE') ? {} : (row.state || {});
      if(row.key === 'milestones') state.msState = (payload.eventType === 'DELETE') ? {} : (row.state || {});
      if(row.key === 'tradingplan') state.planState = (payload.eventType === 'DELETE') ? {} : (row.state || {});
      if(row.key === 'checklist') state.checklistState = (payload.eventType === 'DELETE') ? {} : (row.state || {});
      if(row.key === 'lessons') state.lessonsState = (payload.eventType === 'DELETE') ? {} : (row.state || {});
      renderAll();
    }).subscribe();

    state.sb.channel('trades-changes').on('postgres_changes', {event:'*', schema:'public', table:'trades'}, () => {
      state.sb.from('trades').select('*').order('date', {ascending:false}).limit(500).then(({data}) => {
        state.trades = (data||[]).map(tradeFromRow);
        renderAll();
      });
    }).subscribe();

    state.sb.channel('briefs-changes').on('postgres_changes', {event:'*', schema:'public', table:'briefs'}, () => {
      state.sb.from('briefs').select('*').order('created_at', {ascending:false}).limit(10).then(({data}) => {
        state.briefs = (data||[]).map(briefFromRow);
        renderAll();
      });
    }).subscribe();
  }catch(err){
    state.sb = null;
    localOnlyMode(renderAll);
  }
}

// No `sample` (AI reflection) capability outside the claude.ai artifact viewer —
// the Trade Coach card here is rule-based only (see buildCoachInsights / renderCoachRules).
