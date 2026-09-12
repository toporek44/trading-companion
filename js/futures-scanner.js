// Futures tab — CME/CBOT/NYMEX/COMEX contracts trade nearly 24/5 (Sunday
// 6pm ET through Friday 5pm ET, with a brief daily maintenance halt), so
// like crypto this fills the gap when the regular US stock session is
// closed. No Pillars/setup-grade here (futures have no float/short-
// interest/earnings — the whole small-cap mechanics don't apply); this is
// a fixed watchlist of major contracts ranked by |% change|, with a shared
// macro-news feed in each card's detail (futures move on Fed/CPI/jobs/OPEC
// headlines, not single-contract news the way a stock has its own filing).
import { lsGet, lsSet } from './state.js';
import { scannerFreshnessBucket, escapeHtml, scannerNewsPanelHtml, downloadCsv } from './scanner.js';

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
    <div class="sc-card-clickzone" aria-expanded="${expanded}">
      <div class="sc-card-top">
        <span class="sc-card-rank mono">#${rank} &middot; ${escapeHtml(c.group)}</span>
        <span class="sc-card-expand-hint">${expanded ? '&#9660; hide' : '&#9654; details'}</span>
      </div>
      <div class="sc-card-main">
        <div class="sc-card-ticker mono">
          <span class="sc-card-ticker-sym">${c.symbol.replace('=F','')}</span>${freshnessIconHtml}
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
        </div>
      </div>
    </div>
  </div>`;
}

function renderFuturesList(){
  const cache = lsGet(FUTURES_CACHE_KEY, null);
  const container = document.getElementById('futures-list');
  const empty = document.getElementById('futures-empty');
  if(!cache || !cache.contracts || cache.contracts.length === 0){
    container.innerHTML = '';
    empty.hidden = false;
    return;
  }
  empty.hidden = true;
  container.innerHTML = cache.contracts.map((c,i) => futuresCardHtml(c, i+1)).join('');
}

document.getElementById('futures-list').addEventListener('click', (e) => {
  const zone = e.target.closest('.sc-card-clickzone');
  if(zone){
    const symbol = zone.closest('.sc-stock-card').dataset.symbol;
    if(futuresExpanded.has(symbol)) futuresExpanded.delete(symbol); else futuresExpanded.add(symbol);
    renderFuturesList();
  }
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
  const contracts = cache?.contracts || [];
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
  setInterval(refreshFutures, FUTURES_AUTO_REFRESH_MS);
}
