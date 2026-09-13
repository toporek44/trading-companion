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

export function resetTradeForm(){
  document.getElementById('trade-form').reset();
  document.getElementById('f-date').value = new Date().toISOString().slice(0,10);
  document.getElementById('f-tags').value = '';
  ['f-direction','f-process','f-news'].forEach(id => {
    const group = document.getElementById(id);
    const defaultVal = id === 'f-direction' ? 'Long' : (id === 'f-process' ? 'true' : 'false');
    group.dataset.value = defaultVal;
    group.querySelectorAll('.seg-btn').forEach(b => b.classList.toggle('active', b.dataset.value === defaultVal));
  });
  updateRPreview();
}

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
  const priceRange = await getScannerPriceRange();
  const {meetsPillars, pillarsCount} = computePillars(
    entryPrice,
    isNaN(pctGainOnDay) ? null : pctGainOnDay,
    isNaN(relVolume) ? null : relVolume,
    newsCatalyst,
    isNaN(floatM) ? null : floatM,
    priceRange
  );
  const entry = {
    date: document.getElementById('f-date').value,
    market: document.getElementById('f-market').value,
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
    const {error} = await state.sb.from('trades').insert(row);
    if(error){ alert('Could not save — try again.'); return; }
    await refetchTrades();
  } else {
    entry.id = 'local-'+Date.now();
    state.trades.unshift(entry);
    lsSet('tc-trades', state.trades);
  }
  resetTradeForm();
  renderAll();
});

async function deleteTrade(id){
  if(!confirm('Delete this trade entry?')) return;
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
    const entries = parseTVStrategyExport(text, instrument, strategyName);
    if(entries.length === 0){ statusEl.textContent = 'No trades found in that file.'; return; }
    statusEl.textContent = `Importing ${entries.length} trade${entries.length===1?'':'s'}…`;
    await importTradesFromCSV(entries);
    statusEl.textContent = `Imported ${entries.length} trade${entries.length===1?'':'s'} from TradingView.`;
  }catch(err){
    statusEl.textContent = 'Could not read that file — export "List of Trades" from the Strategy Tester as CSV and try again.';
  } finally {
    e.target.value = '';
  }
});

// ---------- Trade log CSV export (mirrors Scanner's export-what-you-see) ----------
function exportTradesCsv(){
  if(state.trades.length === 0) return;
  const header = [
    'Date','Market','Instrument','Strategy','Direction','EntryPrice','StopPrice','ExitPrice','Size',
    'RiskAmount','ResultAmount','RMultiple','ProcessFollowed','PctGainOnDay','RelVolume','FloatM',
    'NewsCatalyst','Timeframe','Pattern','HoldTime','HoldUnit','MeetsPillars','PillarsCount','Notes','Tags','Source',
  ];
  const rows = state.trades.map(t => [
    t.date, t.market, t.instrument, t.strategy, t.direction, t.entryPrice, t.stopPrice, t.exitPrice, t.size,
    t.riskAmount, t.resultAmount, t.rMultiple, t.processFollowed, t.pctGainOnDay, t.relVolume, t.float,
    t.newsCatalyst, t.timeframe, t.pattern, t.holdTime, t.holdUnit, t.meetsPillars, t.pillarsCount, t.notes, t.tags, t.source,
  ]);
  downloadCsv('journal-trades', header, rows);
}
document.getElementById('journal-export-csv').addEventListener('click', exportTradesCsv);

// ---------- Trade log table ----------
export function renderTradesTable(){
  const tbody = document.getElementById('trades-tbody');
  const emptyEl = document.getElementById('trades-empty');
  tbody.innerHTML = '';
  emptyEl.hidden = state.trades.length > 0;
  state.trades.forEach(t => {
    const tr = document.createElement('tr');
    const resultClass = (t.resultAmount||0) > 0 ? 'good' : ((t.resultAmount||0) < 0 ? 'bad' : '');
    tr.innerHTML = `
      <td class="num">${escapeHtml(t.date)||'—'}</td>
      <td>${escapeHtml(t.market)||'—'}</td>
      <td>${escapeHtml(t.instrument)||'—'}${t.source==='tradingview' ? ' <span class="pill neutral" title="Imported from TradingView">TV</span>' : ''}</td>
      <td>${escapeHtml(t.strategy)||'—'}${(t.tags||'').split(',').map(s=>s.trim()).filter(Boolean).map(tag=>` <span class="pill neutral">${escapeHtml(tag)}</span>`).join('')}</td>
      <td>${escapeHtml(t.direction)||'—'}</td>
      <td class="num"><span class="pill ${resultClass||'neutral'}">${t.resultAmount!=null ? ((t.resultAmount>=0?'+$':'-$')+Math.abs(t.resultAmount).toFixed(2)) : '—'}</span></td>
      <td class="num">${typeof t.rMultiple==='number' ? t.rMultiple.toFixed(2)+'R' : '—'}</td>
      <td>${t.processFollowed ? '<span class="pill good">yes</span>' : '<span class="pill bad">no</span>'}</td>
      <td>${(() => { const pc = t.pillarsCount ?? null; if(!pc) return '<span class="pill">—</span>'; return `<span class="pill ${pc===5?'good':'neutral'}">${pc}/5</span>`; })()}</td>
      <td><button class="btn" style="padding:4px 8px;font-size:11px;" onclick="__deleteTrade('${escapeHtml(t.id).replace(/'/g,"\\'")}')">delete</button></td>`;
    tbody.appendChild(tr);
  });
}
