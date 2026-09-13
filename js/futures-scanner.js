// Futures tab — CME/CBOT/NYMEX/COMEX contracts trade nearly 24/5 (Sunday
// 6pm ET through Friday 5pm ET, with a brief daily maintenance halt), so
// like crypto this fills the gap when the regular US stock session is
// closed. No Pillars/setup-grade here (futures have no float/short-
// interest/earnings — the whole small-cap mechanics don't apply); this is
// a fixed watchlist of major contracts ranked by |% change|, with a shared
// macro-news feed in each card's detail (futures move on Fed/CPI/jobs/OPEC
// headlines, not single-contract news the way a stock has its own filing).
import { lsGet, lsSet } from './state.js';
import { scannerFreshnessBucket, escapeHtml, scannerNewsPanelHtml, downloadCsv, startVisibilityAwareRefresh, getScannerNote, setScannerNote } from './scanner.js';
import { initSegmented } from './journal.js';
import { showPage } from './nav.js';

// Prefixed key so a futures symbol never collides with a stock ticker in
// the shared 'tc-scanner-notes' object.
function getFuturesNote(symbol){ return getScannerNote(`futures:${symbol}`); }
function setFuturesNote(symbol, text){ setScannerNote(`futures:${symbol}`, text); }

const FUTURES_AUTO_REFRESH_MS = 60000;
const FUTURES_CACHE_KEY = 'tc-futures-cache';
const futuresExpanded = new Set();
let macroNewsEntry = null; // shared across all cards — one fetch, not per-contract

function futuresStatus(msg){
  const el = document.getElementById('futures-status');
  if(el) el.textContent = msg;
}

function futuresCardHtml(c, rank){
  const expanded = futuresExpanded.has(c.symbol);
  const pct = c.pct;
  const pctHtml = pct != null
    ? `<span class="sc-card-change num ${pct>=0?'good':'bad'}">${pct>=0?'+':''}${pct.toFixed(2)}%</span>`
    : `<span class="sc-card-change num">&mdash;</span>`;
  const freshnessIconHtml = macroNewsEntry && macroNewsEntry.items?.[0]?.hoursOld != null
    ? `<span title="${escapeHtml(macroNewsEntry.items[0].headline||'')}">${scannerFreshnessBucket(macroNewsEntry.items[0].hoursOld).icon}</span>` : '';

  return `<div class="sc-stock-card" data-symbol="${c.symbol}">
    <div class="sc-card-clickzone" role="button" tabindex="0" aria-expanded="${expanded}" aria-label="${expanded ? 'Collapse' : 'Expand'} ${c.symbol.replace('=F','')} details">
      <div class="sc-card-top">
        <span class="sc-card-rank mono">#${rank} &middot; ${escapeHtml(c.group)}</span>
        <span class="sc-card-expand-hint">${expanded ? '&#9660; hide' : '&#9654; details'}</span>
      </div>
      <div class="sc-card-main">
        <div class="sc-card-ticker mono">
          <span class="sc-card-ticker-sym">${c.symbol.replace('=F','')}</span>${freshnessIconHtml}${getFuturesNote(c.symbol) ? '<span title="You have a note on this contract">&#128221;</span>' : ''}
          <span style="color:var(--muted);font-weight:400;font-size:12px;">${escapeHtml(c.label)}</span>
        </div>
        ${pctHtml}
      </div>
      <div class="sc-card-stats">
        <div class="sc-stat"><span class="k">Price</span><span class="v num">${c.price.toLocaleString(undefined,{maximumFractionDigits:2})}</span></div>
        <div class="sc-stat"><span class="k">Volume</span><span class="v num">${c.volume!=null?c.volume.toLocaleString():'—'}</span></div>
        <div class="sc-stat"><span class="k">Contract</span><span class="v" style="font-size:11px;">${escapeHtml(c.contractName||'')}</span></div>
        <div class="sc-stat"><span class="k">Exchange</span><span class="v" style="font-size:11px;">${escapeHtml(c.exchange||'—')}</span></div>
      </div>
    </div>
    <div class="sc-card-detail" ${expanded ? '' : 'hidden'}>
      <div class="sc-detail-grid">
        <div class="sc-detail-col">
          <h4>Session</h4>
          <ul style="margin:0;padding:0;list-style:none;">
            <li style="display:flex;justify-content:space-between;gap:10px;padding:5px 0;font-size:12px;"><span>Change</span><span style="color:var(--muted);">${pct!=null?(pct>=0?'+':'')+pct.toFixed(2)+'%':'—'}</span></li>
            <li style="display:flex;justify-content:space-between;gap:10px;padding:5px 0;font-size:12px;"><span>Volume</span><span style="color:var(--muted);">${c.volume!=null?c.volume.toLocaleString():'—'}</span></li>
            <li style="display:flex;justify-content:space-between;gap:10px;padding:5px 0;font-size:12px;"><span>Exchange</span><span style="color:var(--muted);">${escapeHtml(c.exchange||'—')}</span></li>
          </ul>
          <p class="sc-detail-hint" style="margin-top:10px;">Futures trade nearly 24/5 (Sun 6pm&ndash;Fri 5pm ET, brief daily maintenance halt) &mdash; volume here is today's session so far, not a 24h figure like crypto. No Pillars/setup-grade score: float, short interest, and single-company catalysts don't apply to an index/commodity/rate contract.</p>
        </div>
        <div class="sc-detail-col">
          <h4>Macro headlines</h4>
          ${scannerNewsPanelHtml(c.symbol, macroNewsEntry)}
          <p class="sc-detail-hint" style="margin-top:8px;">Shared across all contracts &mdash; futures move on Fed/CPI/jobs/OPEC-type macro news, not single-contract filings, so this is one feed rather than per-contract.</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">
            <a class="btn" href="https://finance.yahoo.com/quote/${encodeURIComponent(c.symbol)}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;padding:8px 12px;font-size:12px;text-decoration:none;">Yahoo Finance &#8599;</a>
          </div>
        </div>
        <div class="sc-detail-col">
          <h4>Your notes</h4>
          <textarea class="sc-note-textarea" data-symbol="${c.symbol}" placeholder="Why you're watching this, entry plan, anything to remember later&hellip;" rows="4">${escapeHtml(getFuturesNote(c.symbol))}</textarea>
          <div style="flex:1;"></div>
          <button class="btn primary" style="padding:8px 14px;font-size:12px;margin-top:10px;" onclick="__logFuturesTrade('${c.symbol.replace('=F','').replace(/'/g,"\\'")}')">Log this trade &rarr;</button>
        </div>
      </div>
    </div>
  </div>`;
}

// ---------- Futures: group filter + sorting (parity with US Stocks/Crypto) ----------
// A numeric price/volume filter doesn't fit well here — 14 fixed contracts
// spanning wildly different price scales (a Yen future prices near 0.01,
// an S&P future near 7000) — so this is a categorical Group filter instead,
// which is the natural way to narrow a small fixed watchlist.
initSegmented('fut-group-filter');
document.getElementById('fut-group-filter').addEventListener('click', renderFuturesList);

const FUTURES_SORT_DEFAULT = { key: 'pct', dir: -1 };
const futuresSortState = { ...FUTURES_SORT_DEFAULT, stage: 0 };
function futuresSortRows(contracts){
  return contracts.slice().sort((a, b) => {
    const pick = (c) => {
      switch(futuresSortState.key){
        case 'symbol': return c.symbol;
        case 'price': return c.price;
        case 'volume': return c.volume ?? -Infinity;
        default: return Math.abs(c.pct ?? -Infinity); // |% change| — matches the tab's own "ranked by |% change|" default
      }
    };
    const av = pick(a), bv = pick(b);
    return typeof av === 'string' ? futuresSortState.dir * av.localeCompare(bv) : futuresSortState.dir * (av - bv);
  });
}
document.querySelector('.sc-sort-bar[data-scope="futures"]').addEventListener('click', (e) => {
  const el = e.target.closest('[data-sort]');
  if(!el) return;
  if(futuresSortState.key === el.dataset.sort){
    futuresSortState.stage = (futuresSortState.stage + 1) % 3;
    if(futuresSortState.stage === 0) Object.assign(futuresSortState, FUTURES_SORT_DEFAULT);
    else futuresSortState.dir = futuresSortState.stage === 1 ? 1 : -1;
  } else {
    futuresSortState.key = el.dataset.sort; futuresSortState.dir = 1; futuresSortState.stage = 1;
  }
  renderFuturesList();
});
function updateFuturesSortIndicators(){
  const headRow = document.querySelector('.sc-sort-bar[data-scope="futures"]');
  headRow.querySelectorAll('[data-sort]').forEach(el => {
    const ind = el.querySelector('.sc-sort-ind');
    const isActive = futuresSortState.stage !== 0 && futuresSortState.key === el.dataset.sort;
    const base = (el.dataset.baseLabel ??= el.textContent.trim());
    el.setAttribute('aria-pressed', String(isActive));
    el.setAttribute('aria-label', isActive ? `${base}, sorted ${futuresSortState.dir === 1 ? 'ascending' : 'descending'}` : `Sort by ${base}`);
    if(ind) ind.textContent = isActive ? (futuresSortState.dir === 1 ? ' ▲' : ' ▼') : '';
  });
}

// TC2000-style heatmap, mirroring Crypto's cryptoHeatmapTileHtml — own
// function (not scanner.js's .ticker-keyed version) since this file keys
// off .symbol like Crypto does. A fixed 14-contract watchlist gets less
// value from a heatmap than a large scannable universe does (nothing to
// screen down), but it's still a genuinely useful "which contracts moved
// today" overview at a glance, same reasoning TC2000 built the feature on.
function futuresHeatmapTileHtml(c){
  const pct = c.pct ?? 0;
  const absPct = Math.abs(pct);
  const intensity = Math.min(absPct / 5, 1); // futures move far less than stocks/crypto day-to-day; clamp at 5% for full intensity
  const bg = pct >= 0
    ? `color-mix(in srgb, var(--good) ${15 + intensity*55}%, var(--surface))`
    : `color-mix(in srgb, var(--bad) ${15 + intensity*55}%, var(--surface))`;
  const flex = 1 + intensity * 3;
  return `<div class="sc-heatmap-tile" data-symbol="${c.symbol}" style="background:${bg};flex-grow:${flex};" title="${c.symbol.replace('=F','')}: ${pct>=0?'+':''}${pct.toFixed(2)}% at ${c.price.toLocaleString(undefined,{maximumFractionDigits:2})} — click to expand">
    <span class="sc-heatmap-ticker">${c.symbol.replace('=F','')}</span>
    <span class="sc-heatmap-pct">${pct>=0?'+':''}${pct.toFixed(1)}%</span>
  </div>`;
}
initSegmented('fut-view');
document.getElementById('fut-view').addEventListener('click', renderFuturesList);
document.getElementById('futures-heatmap').addEventListener('click', (e) => {
  const tile = e.target.closest('.sc-heatmap-tile');
  if(!tile) return;
  futuresExpanded.add(tile.dataset.symbol);
  document.getElementById('fut-view').querySelector('[data-value="cards"]').click(); // switch back to Cards so the expanded detail is visible
});

function renderFuturesList(){
  const cache = lsGet(FUTURES_CACHE_KEY, null);
  const container = document.getElementById('futures-list');
  const heatmap = document.getElementById('futures-heatmap');
  const empty = document.getElementById('futures-empty');
  if(!cache || !cache.contracts || cache.contracts.length === 0){
    container.innerHTML = '';
    heatmap.innerHTML = '';
    empty.hidden = false;
    return;
  }
  const groupFilter = document.getElementById('fut-group-filter').dataset.value;
  const filtered = groupFilter === 'all' ? cache.contracts : cache.contracts.filter(c => c.group === groupFilter);
  const sorted = futuresSortRows(filtered);
  empty.hidden = sorted.length > 0;
  const heatmapView = document.getElementById('fut-view').dataset.value === 'heatmap';
  container.hidden = heatmapView;
  heatmap.hidden = !heatmapView;
  if(heatmapView) heatmap.innerHTML = sorted.map(futuresHeatmapTileHtml).join('');
  else container.innerHTML = sorted.map((c,i) => futuresCardHtml(c, i+1)).join('');
  updateFuturesSortIndicators();
}

document.getElementById('futures-list').addEventListener('change', (e) => {
  if(!e.target.matches('.sc-note-textarea')) return;
  // 'change' (not 'input') so this only fires on blur — see crypto-scanner.js's
  // matching handler for why.
  setFuturesNote(e.target.dataset.symbol, e.target.value.trim());
  renderFuturesList();
});
document.getElementById('futures-list').addEventListener('click', (e) => {
  const zone = e.target.closest('.sc-card-clickzone');
  if(zone){
    const symbol = zone.closest('.sc-stock-card').dataset.symbol;
    if(futuresExpanded.has(symbol)) futuresExpanded.delete(symbol); else futuresExpanded.add(symbol);
    renderFuturesList();
  }
});
// See scanner.js's matching keydown handler for why this exists — the
// clickzone is a <div role="button">, which needs manual Enter/Space
// activation (browsers only auto-handle that for real <button>/<a>).
document.getElementById('futures-list').addEventListener('keydown', (e) => {
  if(e.key !== 'Enter' && e.key !== ' ') return;
  const zone = e.target.closest('.sc-card-clickzone');
  if(!zone) return;
  e.preventDefault();
  const symbol = zone.closest('.sc-stock-card').dataset.symbol;
  if(futuresExpanded.has(symbol)) futuresExpanded.delete(symbol); else futuresExpanded.add(symbol);
  renderFuturesList();
});

// See scanner.js's scannerRefreshInFlight for why this guard exists — same
// overlapping-request risk applies here.
let futuresRefreshInFlight = false;
async function refreshFutures(){
  if(futuresRefreshInFlight) return;
  futuresRefreshInFlight = true;
  futuresStatus('Fetching live futures data…');
  try{
    const res = await fetch('/api/scanner-futures');
    const data = await res.json();
    if(data.error){ futuresStatus(`${data.error} Showing last cached data if available.`); return; }
    lsSet(FUTURES_CACHE_KEY, { contracts: data.contracts || [] });
    if(data.macroNews && data.macroNews.configured){
      const items = data.macroNews.items || [];
      macroNewsEntry = { checkedAt: Date.now(), items, headline: items[0]?.headline ?? null, hoursOld: items[0]?.hoursOld ?? null };
    }
    renderFuturesList();
    const newsNote = data.macroNews && !data.macroNews.configured ? ' Macro news needs FINHUB_API_KEY on the server.' : '';
    futuresStatus(`Updated ${new Date(data.fetchedAt).toLocaleTimeString()} — auto-refreshes every ${FUTURES_AUTO_REFRESH_MS/1000}s.${newsNote}`);
  }catch(err){
    futuresStatus('Could not reach the futures endpoint. Showing last cached data if available.');
  }finally{
    futuresRefreshInFlight = false;
  }
}
document.getElementById('futures-refresh').addEventListener('click', refreshFutures);

function exportFuturesCsv(){
  const cache = lsGet(FUTURES_CACHE_KEY, null);
  if(!cache) return;
  const groupFilter = document.getElementById('fut-group-filter').dataset.value;
  const filtered = groupFilter === 'all' ? (cache.contracts || []) : (cache.contracts || []).filter(c => c.group === groupFilter);
  const contracts = futuresSortRows(filtered); // what you see is what you export
  if(contracts.length === 0) return;
  const header = ['Rank','Symbol','Label','Group','Price','Change%','Volume','Contract','Exchange'];
  const rows = contracts.map((c,i) => [
    i+1, c.symbol.replace('=F',''), c.label, c.group, c.price,
    c.pct != null ? c.pct.toFixed(2) : '', c.volume ?? '', c.contractName, c.exchange,
  ]);
  downloadCsv('futures-scanner', header, rows);
}
document.getElementById('futures-export-csv').addEventListener('click', exportFuturesCsv);

let futuresStarted = false;
export function startFuturesIfNeeded(){
  if(futuresStarted) return;
  futuresStarted = true;
  refreshFutures();
  startVisibilityAwareRefresh(refreshFutures, FUTURES_AUTO_REFRESH_MS);
}

// "Log this trade" — same Stocks-only gap already closed for Crypto this
// session. Unlike the watchlist star/saved-presets features (deliberately
// NOT added here, since Futures is already a fixed 14-contract list with
// nothing to screen), jumping straight to a Journal entry is just as
// useful on a small fixed list as a large one. No Journal pillar fields
// filled in, same reasoning as Crypto's version — Pillars don't apply.
window.__logFuturesTrade = function(symbol){
  showPage('journal');
  document.getElementById('f-market').value = 'Futures';
  document.getElementById('f-instrument').value = symbol;
  document.getElementById('f-tags').value = 'from-scanner';
  document.getElementById('f-instrument').scrollIntoView({behavior:'smooth', block:'center'});
};
