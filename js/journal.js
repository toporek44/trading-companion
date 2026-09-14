import { state, lsSet, refetchTrades, escapeHtml, getScannerPriceRange, downloadCsv } from './state.js';
import { renderAll } from './app.js';

// ---------- Journal ----------
document.getElementById('f-date').value = new Date().toISOString().slice(0,10);

// Segmented controls (Direction, Process followed) — click to select, track value on the group.
export function initSegmented(id){
  const group = document.getElementById(id);
  group.addEventListener('click', (e) => {
    const btn = e.target.closest('.seg-btn');
    if(!btn) return;
    group.dataset.value = btn.dataset.value;
    group.querySelectorAll('.seg-btn').forEach(b => b.classList.toggle('active', b === btn));
  });
}
initSegmented('f-direction');
initSegmented('f-process');
initSegmented('f-news');

// Live R-multiple preview as risk/result are filled in.
export function updateRPreview(){
  const risk = parseFloat(document.getElementById('f-risk').value) || 0;
  const result = parseFloat(document.getElementById('f-result').value) || 0;
  const out = document.getElementById('f-rpreview');
  if(risk > 0){
    const r = result / risk;
    out.textContent = (r>=0?'+':'') + r.toFixed(2) + 'R';
    out.classList.toggle('good', r > 0);
    out.classList.toggle('bad', r < 0);
  } else {
    out.textContent = '—';
    out.classList.remove('good','bad');
  }
}
document.getElementById('f-risk').addEventListener('input', updateRPreview);
document.getElementById('f-result').addEventListener('input', updateRPreview);

// Position-size suggestion: risk$ / |entry - stop| = max size that keeps a
// stop-out at exactly the planned risk amount — the "right share size" leg
// of the SAC strategy's 4-part filter (right stock, right entry, right
// share size, active risk mgmt), which this form otherwise left the user to
// do in their head.
function updateSizeSuggestion(){
  const risk = parseFloat(document.getElementById('f-risk').value) || 0;
  const entry = parseFloat(document.getElementById('f-entry').value);
  const stop = parseFloat(document.getElementById('f-stop').value);
  const out = document.getElementById('f-size-suggest');
  const perUnitRisk = (!isNaN(entry) && !isNaN(stop)) ? Math.abs(entry - stop) : 0;
  if(risk > 0 && perUnitRisk > 0){
    const suggested = Math.floor(risk / perUnitRisk);
    out.innerHTML = `Suggested: <button type="button" class="link-btn" id="f-size-apply" style="font:inherit;color:var(--accent);background:none;border:none;padding:0;cursor:pointer;text-decoration:underline;">${suggested}</button> (risk / stop distance)`;
  } else {
    out.textContent = '';
  }
}
['f-entry','f-stop','f-risk'].forEach(id => document.getElementById(id).addEventListener('input', updateSizeSuggestion));
document.getElementById('f-size-suggest').addEventListener('click', (e) => {
  if(e.target.id === 'f-size-apply'){
    const risk = parseFloat(document.getElementById('f-risk').value) || 0;
    const entry = parseFloat(document.getElementById('f-entry').value);
    const stop = parseFloat(document.getElementById('f-stop').value);
    const perUnitRisk = Math.abs(entry - stop);
    document.getElementById('f-size').value = Math.floor(risk / perUnitRisk);
  }
});

function setSegmentedValue(id, value){
  const group = document.getElementById(id);
  group.dataset.value = value;
  group.querySelectorAll('.seg-btn').forEach(b => b.classList.toggle('active', b.dataset.value === value));
}

export function resetTradeForm(){
  document.getElementById('trade-form').reset();
  document.getElementById('f-strategy').querySelectorAll('option[data-injected]').forEach(o => o.remove());
  document.getElementById('f-date').value = new Date().toISOString().slice(0,10);
  document.getElementById('f-tags').value = '';
  setSegmentedValue('f-direction', 'Long');
  setSegmentedValue('f-process', 'true');
  setSegmentedValue('f-news', 'false');
  updateRPreview();
  updateSizeSuggestion();
}

// ---------- Edit an existing trade in place ----------
// Every professional journal tool (Tradervue, Edgewonk) lets you fix a
// typo'd trade without deleting and re-entering it from scratch. Reuses
// the same "New entry" form — populate it from the trade, flip the submit
// handler into update mode, restore on submit/cancel.
let editingTradeId = null;
function populateFormFromTrade(t){
  document.getElementById('f-date').value = t.date || '';
  document.getElementById('f-market').value = t.market || 'Stock';
  document.getElementById('f-instrument').value = t.instrument || '';
  // TradingView-imported trades get their strategy from a free-text
  // window.prompt(), so it can be any string — not one of this <select>'s
  // fixed options. Setting .value to a non-matching string is a silent
  // DOM no-op that leaves the dropdown on its default ("Trend following"),
  // which then gets written back as the trade's strategy on submit unless
  // the user happens to notice and manually reselects it. Inject a
  // temporary option so the actual value round-trips correctly.
  const strategySelect = document.getElementById('f-strategy');
  strategySelect.querySelectorAll('option[data-injected]').forEach(o => o.remove());
  strategySelect.value = t.strategy || '';
  if(t.strategy && strategySelect.value !== t.strategy){
    const opt = document.createElement('option');
    opt.value = t.strategy;
    opt.textContent = t.strategy;
    opt.dataset.injected = 'true';
    strategySelect.insertBefore(opt, strategySelect.firstChild);
    strategySelect.value = t.strategy;
  }
  setSegmentedValue('f-direction', t.direction || 'Long');
  document.getElementById('f-entry').value = t.entryPrice ?? '';
  document.getElementById('f-stop').value = t.stopPrice ?? '';
  document.getElementById('f-exit').value = t.exitPrice ?? '';
  document.getElementById('f-size').value = t.size ?? '';
  document.getElementById('f-risk').value = t.riskAmount ?? '';
  document.getElementById('f-result').value = t.resultAmount ?? '';
  setSegmentedValue('f-process', t.processFollowed ? 'true' : 'false');
  document.getElementById('f-pctgain').value = t.pctGainOnDay ?? '';
  document.getElementById('f-relvol').value = t.relVolume ?? '';
  document.getElementById('f-float').value = t.float ?? '';
  setSegmentedValue('f-news', t.newsCatalyst ? 'true' : 'false');
  document.getElementById('f-timeframe').value = t.timeframe || '';
  document.getElementById('f-pattern').value = t.pattern || '';
  document.getElementById('f-holdtime').value = t.holdTime ?? '';
  document.getElementById('f-holdunit').value = t.holdUnit || 'sec';
  document.getElementById('f-notes').value = t.notes || '';
  document.getElementById('f-tags').value = t.tags || '';
  updateRPreview();
  updateSizeSuggestion();
}

function startEditTrade(id){
  const t = state.trades.find(tr => tr.id === id);
  if(!t) return;
  editingTradeId = id;
  populateFormFromTrade(t);
  document.getElementById('trade-form-submit').textContent = 'Update trade';
  document.getElementById('trade-form-cancel-edit').hidden = false;
  document.getElementById('trade-form').scrollIntoView({behavior:'smooth', block:'start'});
}
window.__editTrade = startEditTrade;
document.getElementById('trade-form-cancel-edit').addEventListener('click', () => {
  editingTradeId = null;
  document.getElementById('trade-form-submit').textContent = 'Add trade';
  document.getElementById('trade-form-cancel-edit').hidden = true;
  resetTradeForm();
});

// Duplicate: same instrument/strategy/setup as an existing trade, but a
// fresh entry (not an edit of the original) — useful for repeated intraday
// setups on the same name. Keeps everything populateFormFromTrade fills in
// EXCEPT the price/size/outcome fields (those are per-fill, not per-setup)
// and the date (defaults to today, not the original trade's date).
function duplicateTrade(id){
  const t = state.trades.find(tr => tr.id === id);
  if(!t) return;
  // Clear any in-progress edit first — otherwise the submit button would
  // still say "Update trade" and overwrite whatever trade was being
  // edited with this duplicated data instead of creating a new entry.
  editingTradeId = null;
  document.getElementById('trade-form-submit').textContent = 'Add trade';
  document.getElementById('trade-form-cancel-edit').hidden = true;
  populateFormFromTrade(t);
  document.getElementById('f-date').value = new Date().toISOString().slice(0,10);
  ['f-entry','f-stop','f-exit','f-size','f-risk','f-result'].forEach(fid => { document.getElementById(fid).value = ''; });
  updateRPreview();
  updateSizeSuggestion();
  document.getElementById('trade-form').scrollIntoView({behavior:'smooth', block:'start'});
  document.getElementById('f-entry').focus();
}
window.__duplicateTrade = duplicateTrade;

// The 5 Pillars, per the Small Account Toolkit / Trading Plan Worksheet:
// rel volume >=5x, up >=10% on the day, has a news catalyst, price in range
// (the Scanner tab's user-editable range — was hardcoded to $1-$20 here,
// which silently drifted from the Scanner's own range once that became
// editable; see getScannerPriceRange in state.js), float <20M shares.
// Each pillar only counts when its underlying value is actually present.
export function computePillars(entryPrice, pctGainOnDay, relVolume, newsCatalyst, floatM, priceRange){
  const { min: priceMin, max: priceMax } = priceRange || { min: 2, max: 20 };
  const priceOk = entryPrice != null && entryPrice >= priceMin && entryPrice <= priceMax;
  const gainOk = pctGainOnDay != null && pctGainOnDay >= 10;
  const relVolOk = relVolume != null && relVolume >= 5;
  const newsOk = newsCatalyst === true;
  const floatOk = floatM != null && floatM < 20;
  const pillarsCount = [priceOk, gainOk, relVolOk, newsOk, floatOk].filter(Boolean).length;
  const meetsPillars = priceOk && gainOk && relVolOk && newsOk && floatOk;
  return {meetsPillars, pillarsCount};
}

document.getElementById('trade-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const risk = parseFloat(document.getElementById('f-risk').value) || 0;
  const result = parseFloat(document.getElementById('f-result').value) || 0;
  const entryPrice = parseFloat(document.getElementById('f-entry').value) || null;
  const pctGainOnDay = parseFloat(document.getElementById('f-pctgain').value);
  const relVolume = parseFloat(document.getElementById('f-relvol').value);
  const floatM = parseFloat(document.getElementById('f-float').value);
  const newsCatalyst = document.getElementById('f-news').dataset.value === 'true';
  const holdTime = parseFloat(document.getElementById('f-holdtime').value);
  const market = document.getElementById('f-market').value;
  // The 5 Pillars (price range, % gain, relative volume, news, float) are
  // small-cap US stock mechanics — the Scanner tab already deliberately
  // has no Pillars/Setup-Grade scoring for Crypto/Futures for this exact
  // reason. computePillars() used to run unconditionally for every trade
  // regardless of market, so an Options/Futures/Crypto trade (e.g. a
  // crypto entry at $45,000, wildly outside the $2-$20 stock range) would
  // get a misleadingly low Pillars score in the trade log and unfairly
  // count against the "trading outside your own setup criteria" Trade
  // Coach insight — a rubric that was never meant to apply to it.
  const priceRange = await getScannerPriceRange();
  const {meetsPillars, pillarsCount} = market === 'Stock' ? computePillars(
    entryPrice,
    isNaN(pctGainOnDay) ? null : pctGainOnDay,
    isNaN(relVolume) ? null : relVolume,
    newsCatalyst,
    isNaN(floatM) ? null : floatM,
    priceRange
  ) : { meetsPillars: null, pillarsCount: null };
  const entry = {
    date: document.getElementById('f-date').value,
    market: market,
    instrument: document.getElementById('f-instrument').value.trim() || '—',
    strategy: document.getElementById('f-strategy').value,
    direction: document.getElementById('f-direction').dataset.value,
    entryPrice: entryPrice,
    stopPrice: parseFloat(document.getElementById('f-stop').value) || null,
    exitPrice: parseFloat(document.getElementById('f-exit').value) || null,
    size: parseFloat(document.getElementById('f-size').value) || null,
    riskAmount: risk,
    resultAmount: result,
    rMultiple: risk > 0 ? (result / risk) : null,
    processFollowed: document.getElementById('f-process').dataset.value === 'true',
    pctGainOnDay: isNaN(pctGainOnDay) ? null : pctGainOnDay,
    relVolume: isNaN(relVolume) ? null : relVolume,
    float: isNaN(floatM) ? null : floatM,
    newsCatalyst: newsCatalyst,
    timeframe: document.getElementById('f-timeframe').value,
    pattern: document.getElementById('f-pattern').value,
    holdTime: isNaN(holdTime) ? null : holdTime,
    holdUnit: document.getElementById('f-holdunit').value,
    meetsPillars: meetsPillars,
    pillarsCount: pillarsCount,
    notes: document.getElementById('f-notes').value.trim(),
    tags: document.getElementById('f-tags').value.trim(),
    source: 'manual',
    createdAt: Date.now(),
  };
  const editId = editingTradeId;
  if(state.sb){
    const row = {
      date: entry.date, market: entry.market, instrument: entry.instrument, strategy: entry.strategy,
      direction: entry.direction, entry_price: entry.entryPrice, stop_price: entry.stopPrice,
      exit_price: entry.exitPrice, size: entry.size, risk_amount: entry.riskAmount,
      result_amount: entry.resultAmount, r_multiple: entry.rMultiple,
      process_followed: entry.processFollowed, notes: entry.notes, source: entry.source, tags: entry.tags,
      pct_gain_on_day: entry.pctGainOnDay, rel_volume: entry.relVolume, float: entry.float,
      news_catalyst: entry.newsCatalyst, timeframe: entry.timeframe, pattern: entry.pattern,
      hold_time: entry.holdTime, hold_unit: entry.holdUnit,
      meets_pillars: entry.meetsPillars, pillars_count: entry.pillarsCount,
    };
    const {error} = editId
      ? await state.sb.from('trades').update(row).eq('id', editId)
      : await state.sb.from('trades').insert(row);
    if(error){ alert('Could not save — try again.'); return; }
    await refetchTrades();
  } else if(editId){
    const idx = state.trades.findIndex(t => t.id === editId);
    if(idx !== -1) state.trades[idx] = { ...entry, id: editId, createdAt: state.trades[idx].createdAt };
    lsSet('tc-trades', state.trades);
  } else {
    entry.id = 'local-'+Date.now();
    state.trades.unshift(entry);
    lsSet('tc-trades', state.trades);
  }
  editingTradeId = null;
  document.getElementById('trade-form-submit').textContent = 'Add trade';
  document.getElementById('trade-form-cancel-edit').hidden = true;
  resetTradeForm();
  renderAll();
});

async function deleteTrade(id){
  if(!confirm('Delete this trade entry?')) return;
  // Deleting the trade currently loaded into the edit form would otherwise
  // leave "Update trade" pointed at an id that no longer exists.
  if(id === editingTradeId){
    editingTradeId = null;
    document.getElementById('trade-form-submit').textContent = 'Add trade';
    document.getElementById('trade-form-cancel-edit').hidden = true;
    resetTradeForm();
  }
  if(state.sb){
    try{ await state.sb.from('trades').delete().eq('id', id); }catch(e){}
    await refetchTrades();
    renderAll();
  }
  else { state.trades = state.trades.filter(t => t.id !== id); lsSet('tc-trades', state.trades); renderAll(); }
}
window.__deleteTrade = deleteTrade;

// ---------- Import from TradingView (Strategy Tester "List of Trades" CSV) ----------
// TradingView has no API for reading trade history, and webhooks only fire from
// Pine strategy alerts — never manual clicks. This covers the one export TradingView
// DOES produce: Strategy Tester → List of Trades → Export. Each trade is 2 rows
// (Entry + Exit) sharing a "Trade #"; we pair them into one journal entry each.
export function parseCSV(text){
  const rows = []; let cur = '', row = [], inQuotes = false;
  for(let i = 0; i < text.length; i++){
    const c = text[i];
    if(inQuotes){
      if(c === '"'){ if(text[i+1] === '"'){ cur += '"'; i++; } else inQuotes = false; }
      else cur += c;
    } else {
      if(c === '"') inQuotes = true;
      else if(c === ','){ row.push(cur); cur = ''; }
      else if(c === '\n' || c === '\r'){
        if(c === '\r' && text[i+1] === '\n') i++;
        row.push(cur); cur = '';
        if(row.some(v => v !== '')) rows.push(row);
        row = [];
      } else cur += c;
    }
  }
  if(cur !== '' || row.length){ row.push(cur); rows.push(row); }
  return rows;
}

export function parseTVStrategyExport(text, instrument, strategyName){
  const rows = parseCSV(text);
  if(rows.length < 2) throw new Error('empty');
  const header = rows[0].map(h => h.trim().toLowerCase());
  const idx = (test) => header.findIndex(h => test(h));
  const iTrade = idx(h => h.startsWith('trade'));
  const iType = idx(h => h === 'type');
  const iDate = idx(h => h.includes('date'));
  const iPrice = idx(h => h.startsWith('price'));
  const iContracts = idx(h => h.includes('contract'));
  const iProfit = idx(h => h.startsWith('profit'));
  if([iTrade,iType,iDate,iPrice].some(i => i < 0)) throw new Error('bad-format');

  const byTrade = {};
  for(let r = 1; r < rows.length; r++){
    const row = rows[r];
    if(!row[iTrade]) continue;
    const num = row[iTrade];
    (byTrade[num] = byTrade[num] || []).push(row);
  }
  const entries = [];
  Object.keys(byTrade).forEach(num => {
    const rowsForTrade = byTrade[num];
    const entryRow = rowsForTrade.find(r => (r[iType]||'').toLowerCase().includes('entry'));
    const exitRow = rowsForTrade.find(r => (r[iType]||'').toLowerCase().includes('exit'));
    if(!entryRow) return;
    const typeStr = (entryRow[iType]||'').toLowerCase();
    // NOT `parseFloat(...) || null` — that treats a real 0 (a legitimate
    // breakeven trade's Net P&L) as falsy and silently turns it into null,
    // which then displays as "—" and drops out of win/loss classification.
    const cleanNum = v => { const n = parseFloat(String(v||'').replace(/[^0-9.\-]/g,'')); return isNaN(n) ? null : n; };
    entries.push({
      date: (entryRow[iDate]||'').split(' ')[0] || '',
      market: 'Stock',
      instrument: instrument || '—',
      strategy: strategyName || 'Other',
      direction: typeStr.includes('short') ? 'Short' : 'Long',
      entryPrice: cleanNum(entryRow[iPrice]),
      stopPrice: null,
      exitPrice: exitRow ? cleanNum(exitRow[iPrice]) : null,
      size: iContracts >= 0 ? cleanNum(entryRow[iContracts]) : null,
      riskAmount: 0,
      resultAmount: exitRow && iProfit >= 0 ? cleanNum(exitRow[iProfit]) : null,
      rMultiple: null,
      processFollowed: true,
      notes: `Imported from TradingView Strategy Tester — Trade #${num}`,
      source: 'tradingview',
      tags: '',
      createdAt: Date.now(),
    });
  });
  return entries;
}

async function importTradesFromCSV(entries){
  if(state.sb){
    const rows = entries.map(e => ({
      date: e.date, market: e.market, instrument: e.instrument, strategy: e.strategy,
      direction: e.direction, entry_price: e.entryPrice, stop_price: e.stopPrice, exit_price: e.exitPrice,
      size: e.size, risk_amount: e.riskAmount, result_amount: e.resultAmount, r_multiple: e.rMultiple,
      process_followed: e.processFollowed, notes: e.notes, source: e.source, tags: e.tags || '',
    }));
    const {error} = await state.sb.from('trades').insert(rows);
    if(error){ throw error; }
    await refetchTrades();
  } else {
    entries.forEach(e => { e.id = 'local-'+Date.now()+'-'+Math.random().toString(36).slice(2); state.trades.unshift(e); });
    lsSet('tc-trades', state.trades);
  }
  renderAll();
}

document.getElementById('tv-import-btn').addEventListener('click', () => {
  document.getElementById('tv-import-input').click();
});
document.getElementById('tv-import-input').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if(!file) return;
  const statusEl = document.getElementById('tv-import-status');
  statusEl.hidden = false;
  statusEl.textContent = 'Reading file…';
  try{
    const text = await file.text();
    const instrument = window.prompt('Instrument for this import (e.g. ES1!, MNQ1!):', '') || '—';
    const strategyName = window.prompt('Strategy name for this import (optional):', 'Other') || 'Other';
    const parsed = parseTVStrategyExport(text, instrument, strategyName);
    if(parsed.length === 0){ statusEl.textContent = 'No trades found in that file.'; return; }
    // TradingView's Strategy Tester export is always the FULL trade
    // history, not incremental — re-exporting after a few more trades and
    // re-importing (a completely normal workflow) would otherwise
    // duplicate every previously-imported trade. Each entry's notes field
    // already carries a unique "Trade #N" from TradingView's own trade
    // numbering (see parseTVStrategyExport above), so (instrument, notes)
    // is a reliable dedup key without needing a new field.
    const alreadyImported = new Set(
      state.trades.filter(t => t.source === 'tradingview').map(t => `${t.instrument}|${t.notes}`)
    );
    const entries = parsed.filter(e => !alreadyImported.has(`${e.instrument}|${e.notes}`));
    const skipped = parsed.length - entries.length;
    if(entries.length === 0){ statusEl.textContent = `All ${parsed.length} trade${parsed.length===1?'':'s'} in that file ${parsed.length===1?'was':'were'} already imported.`; return; }
    statusEl.textContent = `Importing ${entries.length} trade${entries.length===1?'':'s'}…`;
    await importTradesFromCSV(entries);
    statusEl.textContent = `Imported ${entries.length} trade${entries.length===1?'':'s'} from TradingView` + (skipped ? ` (${skipped} already-imported trade${skipped===1?'':'s'} skipped).` : '.');
  }catch(err){
    statusEl.textContent = 'Could not read that file — export "List of Trades" from the Strategy Tester as CSV and try again.';
  } finally {
    e.target.value = '';
  }
});

// ---------- Trade log filter (search + strategy) — per-browser UI state only ----------
let tradesSearchQuery = '';
let tradesStrategyFilter = '';
let tradesMarketFilter = '';
// Column sort — defaults to date desc (newest first, matching the
// insertion order the table always showed before sorting existed), so a
// user who never touches a header sees identical behavior to before.
let tradesSortKey = 'date';
let tradesSortDir = 'desc';

function filteredTrades(){
  const q = tradesSearchQuery.trim().toLowerCase();
  const list = state.trades.filter(t => {
    if(tradesStrategyFilter && t.strategy !== tradesStrategyFilter) return false;
    if(tradesMarketFilter && t.market !== tradesMarketFilter) return false;
    if(!q) return true;
    const haystack = [t.instrument, t.tags, t.notes, t.date].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(q);
  });
  const dir = tradesSortDir === 'asc' ? 1 : -1;
  const key = tradesSortKey;
  const numericKeys = new Set(['resultAmount', 'rMultiple']);
  return list.slice().sort((a, b) => {
    let av = a[key], bv = b[key];
    if(numericKeys.has(key)){
      av = typeof av === 'number' ? av : -Infinity;
      bv = typeof bv === 'number' ? bv : -Infinity;
    } else {
      av = (av || '').toString().toLowerCase();
      bv = (bv || '').toString().toLowerCase();
    }
    if(av < bv) return -1 * dir;
    if(av > bv) return 1 * dir;
    return 0;
  });
}

function refreshStrategyFilterOptions(){
  const sel = document.getElementById('trades-strategy-filter');
  const strategies = [...new Set(state.trades.map(t => t.strategy).filter(Boolean))].sort();
  const current = sel.value;
  sel.innerHTML = `<option value="">All strategies</option>${strategies.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('')}`;
  if(strategies.includes(current)) sel.value = current;
}

document.getElementById('trades-search').addEventListener('input', (e) => {
  tradesSearchQuery = e.target.value;
  renderTradesTable();
});
document.getElementById('trades-market-filter').addEventListener('change', (e) => {
  tradesMarketFilter = e.target.value;
  renderTradesTable();
});
document.getElementById('trades-strategy-filter').addEventListener('change', (e) => {
  tradesStrategyFilter = e.target.value;
  renderTradesTable();
});

// ---------- Trade log CSV export (mirrors Scanner's export-what-you-see) ----------
function exportTradesCsv(){
  const list = filteredTrades();
  if(list.length === 0) return;
  const header = [
    'Date','Market','Instrument','Strategy','Direction','EntryPrice','StopPrice','ExitPrice','Size',
    'RiskAmount','ResultAmount','RMultiple','ProcessFollowed','PctGainOnDay','RelVolume','FloatM',
    'NewsCatalyst','Timeframe','Pattern','HoldTime','HoldUnit','MeetsPillars','PillarsCount','Notes','Tags','Source',
  ];
  const rows = list.map(t => [
    t.date, t.market, t.instrument, t.strategy, t.direction, t.entryPrice, t.stopPrice, t.exitPrice, t.size,
    t.riskAmount, t.resultAmount, t.rMultiple, t.processFollowed, t.pctGainOnDay, t.relVolume, t.float,
    t.newsCatalyst, t.timeframe, t.pattern, t.holdTime, t.holdUnit, t.meetsPillars, t.pillarsCount, t.notes, t.tags, t.source,
  ]);
  downloadCsv('journal-trades', header, rows);
}
document.getElementById('journal-export-csv').addEventListener('click', exportTradesCsv);

// Prints just the Weekly Performance report card (mirrors this app's own
// weekly-reporting-template.pdf) rather than the whole dense Journal page
// (trade log, equity chart, R-histogram, etc. all at once). See the
// print-scope-active rule in styles.css.
document.getElementById('weekly-report-print-btn').addEventListener('click', () => {
  document.body.classList.add('print-scope-active');
  window.print();
});
window.addEventListener('afterprint', () => document.body.classList.remove('print-scope-active'));

// ---------- Tag suggestions (avoid re-typing/misspelling a tag you've
// already used — inconsistent spelling silently fragments the By-Tag
// stats table, since it groups by exact string match) ----------
function renderTagSuggestions(){
  const root = document.getElementById('f-tags-suggestions');
  if(!root) return;
  const counts = {};
  state.trades.forEach(t => {
    (t.tags||'').split(',').map(s=>s.trim()).filter(Boolean).forEach(tag => { counts[tag] = (counts[tag]||0) + 1; });
  });
  const topTags = Object.keys(counts).sort((a,b) => counts[b]-counts[a]).slice(0, 10);
  root.innerHTML = topTags.map(tag => `<button type="button" class="btn" data-tag="${escapeHtml(tag)}" style="display:inline-block;width:auto;padding:3px 9px;font-size:.72rem;">+ ${escapeHtml(tag)}</button>`).join('');
}
document.getElementById('f-tags-suggestions')?.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-tag]');
  if(!btn) return;
  const input = document.getElementById('f-tags');
  const existing = input.value.split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
  if(existing.includes(btn.dataset.tag.toLowerCase())) return;
  input.value = input.value.trim() ? `${input.value.trim()}, ${btn.dataset.tag}` : btn.dataset.tag;
  input.focus();
});

// ---------- Trade log table ----------
// Bulk selection — for cleaning up a bad import or a batch of test/mistake
// entries without deleting one at a time. Selection is per-browser-session
// only (not persisted): intentionally resets on every render so a stale
// selection can never silently apply to a different filtered view.
let selectedTradeIds = new Set();

// Notes/thesis are captured on every trade but were only ever visible by
// opening edit mode — a trader glancing back at the log to recall "why did
// I take this" had to click edit, read, then cancel. Click the instrument
// cell to expand an inline detail row instead. Per-browser-session only,
// same tier as the selection Set above.
let expandedTradeIds = new Set();

function updateBulkDeleteButton(){
  const btn = document.getElementById('trades-bulk-delete');
  const tagBtn = document.getElementById('trades-bulk-tag');
  if(btn){
    btn.hidden = selectedTradeIds.size === 0;
    btn.textContent = `Delete selected (${selectedTradeIds.size})`;
  }
  if(tagBtn) tagBtn.hidden = selectedTradeIds.size === 0;
}

export function renderTradesTable(){
  const tbody = document.getElementById('trades-tbody');
  const emptyEl = document.getElementById('trades-empty');
  refreshStrategyFilterOptions();
  renderTagSuggestions();
  const list = filteredTrades();
  // Drop selections for trades no longer in view (deleted, or filtered out).
  const visibleIds = new Set(list.map(t => t.id));
  selectedTradeIds.forEach(id => { if(!visibleIds.has(id)) selectedTradeIds.delete(id); });
  expandedTradeIds.forEach(id => { if(!visibleIds.has(id)) expandedTradeIds.delete(id); });
  tbody.innerHTML = '';
  emptyEl.hidden = list.length > 0;
  emptyEl.querySelector('div:last-child').textContent = state.trades.length === 0
    ? 'No trades logged yet — your first paper trade goes here.'
    : 'No trades match your search/filter.';
  list.forEach(t => {
    const tr = document.createElement('tr');
    const resultClass = (t.resultAmount||0) > 0 ? 'good' : ((t.resultAmount||0) < 0 ? 'bad' : '');
    const hasNotes = !!(t.notes && t.notes.trim());
    const expanded = expandedTradeIds.has(t.id);
    tr.innerHTML = `
      <td><input type="checkbox" class="trade-select" data-id="${escapeHtml(t.id)}" ${selectedTradeIds.has(t.id) ? 'checked' : ''} aria-label="Select this trade"></td>
      <td class="num">${escapeHtml(t.date)||'—'}</td>
      <td>${escapeHtml(t.market)||'—'}</td>
      <td>${hasNotes ? `<button type="button" class="trade-expand-btn" data-id="${escapeHtml(t.id)}" aria-expanded="${expanded}" title="${expanded?'Hide':'Show'} thesis/notes" style="background:none;border:none;padding:0;font:inherit;cursor:pointer;color:inherit;text-align:left;">${expanded?'▾':'▸'} ${escapeHtml(t.instrument)||'—'}</button>` : (escapeHtml(t.instrument)||'—')}${t.source==='tradingview' ? ' <span class="pill neutral" title="Imported from TradingView">TV</span>' : ''}</td>
      <td>${escapeHtml(t.strategy)||'—'}${(t.tags||'').split(',').map(s=>s.trim()).filter(Boolean).map(tag=>` <span class="pill neutral">${escapeHtml(tag)}</span>`).join('')}</td>
      <td>${escapeHtml(t.direction)||'—'}</td>
      <td class="num"><span class="pill ${resultClass||'neutral'}">${t.resultAmount!=null ? ((t.resultAmount>=0?'+$':'-$')+Math.abs(t.resultAmount).toFixed(2)) : '—'}</span></td>
      <td class="num">${typeof t.rMultiple==='number' ? t.rMultiple.toFixed(2)+'R' : '—'}</td>
      <td>${t.processFollowed ? '<span class="pill good">yes</span>' : '<span class="pill bad">no</span>'}</td>
      <td>${(() => { const pc = t.pillarsCount ?? null; if(!pc) return '<span class="pill">—</span>'; return `<span class="pill ${pc===5?'good':'neutral'}">${pc}/5</span>`; })()}</td>
      <td style="white-space:nowrap;">
        <button class="btn" style="padding:4px 8px;font-size:11px;" onclick="__duplicateTrade('${escapeHtml(t.id).replace(/'/g,"\\'")}')" title="Log another trade with the same instrument/strategy/setup">duplicate</button>
        <button class="btn" style="padding:4px 8px;font-size:11px;" onclick="__editTrade('${escapeHtml(t.id).replace(/'/g,"\\'")}')">edit</button>
        <button class="btn" style="padding:4px 8px;font-size:11px;" onclick="__deleteTrade('${escapeHtml(t.id).replace(/'/g,"\\'")}')">delete</button>
      </td>`;
    tbody.appendChild(tr);
    if(hasNotes && expanded){
      const detailTr = document.createElement('tr');
      detailTr.className = 'trade-detail-row';
      const cell = document.createElement('td');
      cell.colSpan = 11;
      cell.style.cssText = 'white-space:pre-wrap;font-size:.85rem;color:var(--muted);padding:8px 10px 12px 34px;';
      cell.textContent = t.notes;
      detailTr.appendChild(cell);
      tbody.appendChild(detailTr);
    }
  });
  const selectAll = document.getElementById('trades-select-all');
  if(selectAll){
    selectAll.checked = list.length > 0 && list.every(t => selectedTradeIds.has(t.id));
    selectAll.indeterminate = selectedTradeIds.size > 0 && !selectAll.checked;
  }
  updateBulkDeleteButton();
  document.querySelectorAll('.th-sort').forEach(btn => {
    const active = btn.dataset.sortKey === tradesSortKey;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-sort', active ? (tradesSortDir === 'asc' ? 'ascending' : 'descending') : 'none');
    const base = btn.textContent.replace(/[▲▼]\s*$/, '').trim();
    btn.textContent = active ? `${base} ${tradesSortDir === 'asc' ? '▲' : '▼'}` : base;
  });
}

document.querySelector('#trades-tbody')?.closest('table')?.querySelector('thead')?.addEventListener('click', (e) => {
  const btn = e.target.closest('.th-sort');
  if(!btn) return;
  const key = btn.dataset.sortKey;
  if(tradesSortKey === key){
    tradesSortDir = tradesSortDir === 'asc' ? 'desc' : 'asc';
  } else {
    tradesSortKey = key;
    tradesSortDir = key === 'date' ? 'desc' : 'desc';
  }
  renderTradesTable();
});

document.getElementById('trades-tbody')?.addEventListener('click', (e) => {
  const btn = e.target.closest('.trade-expand-btn');
  if(!btn) return;
  const id = btn.dataset.id;
  if(expandedTradeIds.has(id)) expandedTradeIds.delete(id); else expandedTradeIds.add(id);
  renderTradesTable();
});
document.getElementById('trades-tbody')?.addEventListener('change', (e) => {
  const cb = e.target.closest('input.trade-select');
  if(!cb) return;
  if(cb.checked) selectedTradeIds.add(cb.dataset.id); else selectedTradeIds.delete(cb.dataset.id);
  updateBulkDeleteButton();
  const selectAll = document.getElementById('trades-select-all');
  if(selectAll){
    const rows = [...document.querySelectorAll('#trades-tbody input.trade-select')];
    selectAll.checked = rows.length > 0 && rows.every(r => r.checked);
    selectAll.indeterminate = rows.some(r => r.checked) && !selectAll.checked;
  }
});
document.getElementById('trades-select-all')?.addEventListener('change', (e) => {
  document.querySelectorAll('#trades-tbody input.trade-select').forEach(cb => {
    cb.checked = e.target.checked;
    if(e.target.checked) selectedTradeIds.add(cb.dataset.id); else selectedTradeIds.delete(cb.dataset.id);
  });
  updateBulkDeleteButton();
});
document.getElementById('trades-bulk-delete')?.addEventListener('click', async () => {
  const ids = [...selectedTradeIds];
  if(ids.length === 0) return;
  if(!confirm(`Delete ${ids.length} selected trade${ids.length===1?'':'s'}? This can't be undone.`)) return;
  // Same stale-edit guard as the single-trade delete — if the trade
  // currently open in the edit form is among those selected, clear the
  // form so "Update trade" doesn't end up pointed at a deleted id.
  if(editingTradeId && ids.includes(editingTradeId)){
    editingTradeId = null;
    document.getElementById('trade-form-submit').textContent = 'Add trade';
    document.getElementById('trade-form-cancel-edit').hidden = true;
    resetTradeForm();
  }
  if(state.sb){
    try{ await state.sb.from('trades').delete().in('id', ids); }catch(e){}
    await refetchTrades();
  } else {
    state.trades = state.trades.filter(t => !ids.includes(t.id));
    lsSet('tc-trades', state.trades);
  }
  selectedTradeIds.clear();
  renderAll();
});

document.getElementById('trades-bulk-tag')?.addEventListener('click', async () => {
  const ids = [...selectedTradeIds];
  if(ids.length === 0) return;
  const tag = (prompt(`Add a tag to ${ids.length} selected trade${ids.length===1?'':'s'}:`) || '').trim();
  if(!tag) return;
  const targets = state.trades.filter(t => ids.includes(t.id));
  // No single-call batched update with per-row differing values in
  // Supabase's JS client (unlike bulk-delete's one .in() call) — each
  // trade's existing tags string differs, so this is N individual
  // updates. Still a real UX win: one prompt instead of N edit-trade trips.
  for(const t of targets){
    const existing = (t.tags||'').split(',').map(s=>s.trim()).filter(Boolean);
    if(existing.some(e => e.toLowerCase() === tag.toLowerCase())) continue;
    const newTags = existing.concat(tag).join(', ');
    if(state.sb){
      try{ await state.sb.from('trades').update({ tags: newTags }).eq('id', t.id); }catch(e){}
    } else {
      t.tags = newTags;
    }
  }
  if(state.sb){ await refetchTrades(); } else { lsSet('tc-trades', state.trades); }
  renderAll();
});
