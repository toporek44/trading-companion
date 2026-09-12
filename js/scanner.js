import { lsGet, lsSet } from './state.js';
import { initSegmented } from './journal.js';
import { showPage } from './nav.js';

// ---------- Scanner (Finviz Elite + Finnhub, server-side, auto-refreshing) ----------
// No manual API key ever needed here — FINVIZ_API_KEY / FINHUB_API_KEY are
// configured server-side (Vercel env vars). If either isn't set, the
// relevant feature just reports a clear "not configured" status instead
// of silently doing nothing.
const SCANNER_CACHE_KEY = 'tc-scanner-cache';
const AUTO_REFRESH_MS = 60000; // 60s — frequent enough to catch a fresh mover quickly without hammering the API; also the cadence alerts will piggyback on.

['sc-minprice','sc-maxprice','sc-minpct','sc-minvol'].forEach(id => {
  document.getElementById(id).addEventListener('input', renderScannerTables);
});

function scannerStatus(msg){ document.getElementById('scanner-status').textContent = msg; }

async function refreshScanner(){
  scannerStatus('Fetching top gainers / most active…');
  try{
    const res = await fetch('/api/scanner-gainers');
    const data = await res.json();
    if(data.configured === false){
      scannerStatus('Scanner not configured — FINVIZ_API_KEY is not set on the server (see docs/scanner-upgrade-plan.md).');
      return;
    }
    if(data.error){ scannerStatus(`${data.error} Showing last cached scan if available.`); return; }
    lsSet(SCANNER_CACHE_KEY, { fetchedAt: data.fetchedAt, top_gainers: data.top_gainers||[], most_actively_traded: data.most_actively_traded||[] });
    scannerStatus(`Scan updated ${new Date(data.fetchedAt).toLocaleTimeString()} — auto-refreshes every ${AUTO_REFRESH_MS/1000}s.`);
    renderScannerTables();
    checkScannerPillarAlerts(data.top_gainers||[]);
    autoCheckTopNews((data.top_gainers||[]).map(r => r.ticker)); // fire-and-forget, updates the fire-icon badges as results come in
  }catch(err){
    scannerStatus('Could not reach the scanner endpoint. Showing last cached scan if available.');
  }
}
document.getElementById('scanner-refresh').addEventListener('click', refreshScanner);
refreshScanner(); // fetch immediately on load, don't wait for a click or the first interval tick
setInterval(refreshScanner, AUTO_REFRESH_MS);

function scannerFilterRow(row){
  const minP = parseFloat(document.getElementById('sc-minprice').value) || 0;
  const maxP = parseFloat(document.getElementById('sc-maxprice').value) || Infinity;
  const minPct = parseFloat(document.getElementById('sc-minpct').value) || 0;
  const minVol = parseFloat(document.getElementById('sc-minvol').value) || 0;
  return row.price >= minP && row.price <= maxP && Math.abs(row.pct) >= minPct && row.vol >= minVol;
}
// Manual per-ticker News/Float overrides — always available as a correction
// on top of Finviz's automatic values (e.g. for a symbol Finviz has no
// float data for), kept in localStorage (session-durable, not synced).
const SCANNER_MANUAL_KEY = 'tc-scanner-manual';
function getScannerManual(){ return lsGet(SCANNER_MANUAL_KEY, {}); }
function setScannerManualField(ticker, field, value){
  const manual = getScannerManual();
  manual[ticker] = {...(manual[ticker]||{}), [field]: value};
  lsSet(SCANNER_MANUAL_KEY, manual);
}
const SCANNER_VOL_PILLAR_MIN = 500000; // rough liquidity proxy, used only if a row somehow has no relVol at all
const SCANNER_RELVOL_PILLAR_MIN = 5; // the Toolkit's real bar: relative volume >=5x average

// Catalyst types a trader can tag a row with by hand. "merger" is deliberately
// excluded from ever counting as a good catalyst — per the Small Account
// Toolkit and Ross Cameron's own scanning routine, a fixed buyout price kills
// the volatility that makes a stock worth day-trading.
const CATALYST_TYPES = {
  earnings: { label: 'Earnings', good: true },
  fda: { label: 'FDA approval', good: true },
  clinical: { label: 'Clinical trial results', good: true },
  contract: { label: 'New contract / partnership', good: true },
  other: { label: 'Other catalyst', good: true },
  merger: { label: 'Merger / buyout / acquisition', good: false },
};
function scannerCatalystBadgeHtml(catalystType){
  const info = CATALYST_TYPES[catalystType];
  if(!info) return '';
  return info.good
    ? `<span class="pill good" title="Counts toward the News pillar">${info.label}</span>`
    : `<span class="pill bad" title="Buyout/merger catalysts don't count — the stock's value is fixed once a deal price is set">&#9888; ${info.label}</span>`;
}
// News pillar is true only when there's real fresh news (checked today, <=24h
// old) or a manually-tagged good catalyst — and NEVER true for a merger/buyout
// catalyst, even if news was found, since that kind of "catalyst" kills the
// volatility this whole system is built to trade.
function scannerNewsOk(newsEntry, catalystType){
  if(catalystType === 'merger') return false;
  if(newsEntry) return newsEntry.hoursOld != null && newsEntry.hoursOld <= 24;
  return !!catalystType;
}

function scannerPillars(price, pct, vol, newsOk, floatM, relVol){
  const priceOk = price >= 1 && price <= 20;
  const gainOk = Math.abs(pct) >= 10;
  const volOk = relVol != null ? relVol >= SCANNER_RELVOL_PILLAR_MIN : vol >= SCANNER_VOL_PILLAR_MIN;
  const floatOk = floatM != null && floatM < 20;
  const count = [priceOk, gainOk, volOk, newsOk, floatOk].filter(Boolean).length;
  return count;
}

// ---------- Scanner: real news freshness (Finnhub, cached per ticker per day) ----------
const NEWS_CACHE_KEY = 'tc-scanner-news-cache';
function scannerTodayStr(){ return new Date().toISOString().slice(0,10); }
function getScannerNewsCache(){ return lsGet(NEWS_CACHE_KEY, {}); }
function setScannerNewsCacheEntry(ticker, entry){
  const cache = getScannerNewsCache();
  cache[`${ticker}|${scannerTodayStr()}`] = entry;
  lsSet(NEWS_CACHE_KEY, cache);
}
function getScannerNewsToday(ticker){
  return getScannerNewsCache()[`${ticker}|${scannerTodayStr()}`] || null;
}
// Freshness buckets, per Ross Cameron's "news comes out at the top and
// bottom of every hour" routine — an icon-first read so a whole row of
// tickers can be scanned for "which of these is actually fresh" at a glance.
function scannerFreshnessBucket(h){
  if(h < 2) return { icon: '&#128293;', label: '<2h', cls: 'good' };   // 🔥 breaking
  if(h < 4) return { icon: '&#128994;', label: '<4h', cls: 'good' };   // 🟢 fresh
  if(h < 12) return { icon: '&#128993;', label: '<12h', cls: 'neutral' }; // 🟡
  if(h < 24) return { icon: '&#128992;', label: '<24h', cls: '' };     // 🟠
  return { icon: '&#9898;', label: `${Math.floor(h/24)}d+`, cls: '' }; // ⚪ stale
}
function scannerNewsBadgeHtml(entry){
  if(!entry) return '';
  if(entry.hoursOld == null) return `<span class="pill" title="No recent articles found">no news found</span>`;
  const b = scannerFreshnessBucket(entry.hoursOld);
  const title = entry.headline ? entry.headline.replace(/"/g,'&quot;') : '';
  return `<span class="pill ${b.cls}" title="${title}">${b.icon} ${b.label} old</span>`;
}
async function checkScannerNews(ticker, {silent} = {}){
  if(!silent) scannerStatus(`Checking news freshness for ${ticker}…`);
  try{
    const res = await fetch(`/api/scanner-news?symbol=${encodeURIComponent(ticker)}`);
    const data = await res.json();
    if(data.configured === false){ if(!silent) scannerStatus('News check not configured — FINHUB_API_KEY is not set on the server.'); return; }
    if(data.error){ if(!silent) scannerStatus(`${data.error} News check for ${ticker} not completed.`); return; }
    setScannerNewsCacheEntry(ticker, { checkedAt: Date.now(), hoursOld: data.hoursOld, headline: data.headline, url: null });
    checkScannerNewsFreshnessAlert(ticker, data);
    if(!silent){
      scannerStatus(data.hoursOld != null
        ? `${ticker}: latest news is ~${data.hoursOld.toFixed(1)}h old (checked just now, cached for today).`
        : `No recent news found for ${ticker} (checked just now, cached for today).`);
      renderScannerTables();
    }
  }catch(err){
    if(!silent) scannerStatus(`Could not reach the news endpoint for ${ticker}.`);
  }
}

// Automatically checks news freshness for the top N rows right after every
// refresh, so the 🔥 fire-icon freshness badge shows up with no manual
// "Check news" click needed — Finnhub's free tier (60 calls/min) has
// plenty of headroom for this.
const AUTO_NEWS_CHECK_COUNT = 8;
async function autoCheckTopNews(tickers){
  let checkedAny = false;
  for(const ticker of tickers.slice(0, AUTO_NEWS_CHECK_COUNT)){
    if(getScannerNewsToday(ticker)) continue; // already cached today
    await checkScannerNews(ticker, {silent: true});
    checkedAny = true;
  }
  if(checkedAny) renderScannerTables();
}

// ---------- Scanner: proactive browser-notification alerts ----------
// Opt-in (user gesture required for Notification.requestPermission — can't
// auto-request on load). Fires when a ticker newly hits 5/5 Pillars, or a
// tracked ticker's news freshness newly lands in the 🔥 <2h tier — each
// ticker+condition alerts once per calendar day so a still-qualifying
// ticker doesn't re-alert on every 60s refresh.
//
// Hard limitation (also stated in the UI): the browser Notification API
// only fires while this tab is open (it can be backgrounded/minimized and
// still work in most browsers) — it will NOT fire if the browser or tab is
// fully closed. There's no service worker / push-server behind this.
const ALERTS_ENABLED_KEY = 'tc-scanner-alerts-enabled';
const ALERTS_FIRED_KEY = 'tc-scanner-alerts-fired-today';

function scannerAlertsSupported(){ return typeof Notification !== 'undefined'; }
function scannerAlertsEnabled(){ return lsGet(ALERTS_ENABLED_KEY, false); }
function setScannerAlertsEnabled(v){ lsSet(ALERTS_ENABLED_KEY, !!v); }

function getScannerAlertsFiredToday(){
  const stored = lsGet(ALERTS_FIRED_KEY, null);
  if(!stored || stored.date !== scannerTodayStr()) return {};
  return stored.fired || {};
}
function hasScannerAlertFired(ticker, cond){
  return !!getScannerAlertsFiredToday()[`${ticker}|${cond}`];
}
function markScannerAlertFired(ticker, cond){
  const fired = getScannerAlertsFiredToday();
  fired[`${ticker}|${cond}`] = true;
  lsSet(ALERTS_FIRED_KEY, { date: scannerTodayStr(), fired });
}

function scannerAlertsActive(){
  return scannerAlertsSupported() && Notification.permission === 'granted' && scannerAlertsEnabled();
}
function fireScannerAlert(title, body){
  if(!scannerAlertsActive()) return;
  try{ new Notification(title, { body }); }catch(err){ /* notification creation can throw in some contexts; alerts are best-effort */ }
}
function findScannerCachedRow(ticker){
  const cache = lsGet(SCANNER_CACHE_KEY, null);
  if(!cache) return null;
  return (cache.top_gainers||[]).find(r => r.ticker === ticker) || (cache.most_actively_traded||[]).find(r => r.ticker === ticker) || null;
}
function scannerAlertLine(row){
  return `${row.ticker} ${row.pct>=0?'+':''}${row.pct.toFixed(2)}% at $${row.price.toFixed(2)}`;
}
// Trigger 1: a ticker newly appears in top_gainers with a full 5/5 pillar
// score that wasn't already alerted today.
function checkScannerPillarAlerts(rawGainers){
  if(!scannerAlertsActive()) return;
  rawGainers.forEach(row => {
    if(row.price == null || row.pct == null) return;
    const d = scannerRowData(row);
    if(d.pillarCount === 5 && !hasScannerAlertFired(d.ticker, 'pillars5')){
      markScannerAlertFired(d.ticker, 'pillars5');
      fireScannerAlert(`${d.ticker} — 5/5 Pillars`, `${scannerAlertLine(d)} — 5/5 pillars`);
    }
  });
}
// Trigger 2: a tracked ticker's news check newly lands in the 🔥 <2h tier
// for the first time today. `data` is the raw /api/scanner-news response.
function checkScannerNewsFreshnessAlert(ticker, data){
  if(!scannerAlertsActive()) return;
  if(data.hoursOld == null || data.hoursOld >= 2) return;
  if(hasScannerAlertFired(ticker, 'freshnews')) return;
  markScannerAlertFired(ticker, 'freshnews');
  const row = findScannerCachedRow(ticker);
  const prefix = row ? scannerAlertLine(row) : ticker;
  const headline = data.headline ? `: ${data.headline}` : '';
  fireScannerAlert(`${ticker} — fresh news (<2h)`, `${prefix} — fresh news${headline}`);
}

function updateScannerAlertsUI(){
  const btn = document.getElementById('scanner-alerts-toggle');
  const state = document.getElementById('scanner-alerts-state');
  if(!btn || !state) return;
  if(!scannerAlertsSupported()){
    btn.disabled = true;
    state.textContent = 'Notifications are not supported in this browser.';
    return;
  }
  const perm = Notification.permission; // 'default' | 'granted' | 'denied'
  if(perm === 'denied'){
    state.textContent = 'Alerts: blocked — check your browser\'s site settings.';
    btn.textContent = 'Enable alerts';
  } else if(perm === 'granted' && scannerAlertsEnabled()){
    state.textContent = 'Alerts: on';
    btn.textContent = 'Disable alerts';
  } else {
    state.textContent = 'Alerts: off (click to enable)';
    btn.textContent = 'Enable alerts';
  }
}
document.getElementById('scanner-alerts-toggle').addEventListener('click', async () => {
  if(!scannerAlertsSupported()) return;
  const perm = Notification.permission;
  if(perm === 'granted' && scannerAlertsEnabled()){
    setScannerAlertsEnabled(false); // currently on — turn off
    updateScannerAlertsUI();
    return;
  }
  if(perm === 'denied'){ updateScannerAlertsUI(); return; } // browser won't re-prompt; nothing we can do here
  const result = perm === 'granted' ? 'granted' : await Notification.requestPermission();
  setScannerAlertsEnabled(result === 'granted');
  updateScannerAlertsUI();
});
updateScannerAlertsUI();

// ---------- Scanner: watchlist (localStorage, ticker array) ----------
const SCANNER_WATCHLIST_KEY = 'tc-scanner-watchlist';
function getScannerWatchlist(){ return lsGet(SCANNER_WATCHLIST_KEY, []); }
function isScannerWatched(ticker){ return getScannerWatchlist().includes(ticker); }
function toggleScannerWatch(ticker){
  const list = getScannerWatchlist();
  const idx = list.indexOf(ticker);
  if(idx >= 0) list.splice(idx, 1); else list.push(ticker);
  lsSet(SCANNER_WATCHLIST_KEY, list);
}
initSegmented('sc-watch-filter');
document.getElementById('sc-watch-filter').addEventListener('click', () => renderScannerTables());

// ---------- Scanner: sortable columns (in-memory only, resets on refresh) ----------
// Default sort: Change % descending, so the leading gainer of the day is row one.
const scannerSortState = { gainers: {key:'pct', dir:-1}, active: {key:'pct', dir:-1} };
document.querySelectorAll('.sc-sort-row').forEach(headRow => {
  headRow.addEventListener('click', (e) => {
    const th = e.target.closest('th[data-sort]');
    if(!th) return;
    const scope = headRow.dataset.scope;
    const state = scannerSortState[scope];
    if(state.key === th.dataset.sort){ state.dir *= -1; } else { state.key = th.dataset.sort; state.dir = 1; }
    renderScannerTables();
  });
});
function scannerUpdateSortIndicators(){
  document.querySelectorAll('.sc-sort-row').forEach(headRow => {
    const state = scannerSortState[headRow.dataset.scope];
    headRow.querySelectorAll('th[data-sort]').forEach(th => {
      const ind = th.querySelector('.sc-sort-ind');
      if(!ind) return;
      ind.textContent = state.key === th.dataset.sort ? (state.dir === 1 ? ' ▲' : ' ▼') : '';
    });
  });
}
function scannerSortRows(rows, scope){
  const state = scannerSortState[scope];
  if(!state.key) return rows;
  const sorted = rows.slice().sort((a,b) => {
    if(state.key === 'ticker') return state.dir * a.ticker.localeCompare(b.ticker);
    // Rows with no manual float yet sort as -Infinity so they fall to the
    // bottom on a descending sort rather than breaking the comparator.
    const pick = (d) => {
      switch(state.key){
        case 'price': return d.price;
        case 'pct': return d.pct;
        case 'vol': return d.vol;
        case 'relvol': return d.relVol != null ? d.relVol : -Infinity;
        case 'float': return d.floatM != null ? d.floatM : -Infinity;
        case 'floatrot': return d.floatRotation != null ? d.floatRotation : -Infinity;
        case 'shortpct': return d.shortFloatPct != null ? d.shortFloatPct : -Infinity;
        default: return d.pillarCount;
      }
    };
    return state.dir * (pick(a) - pick(b));
  });
  return sorted;
}

// Computes all derived per-row fields once so filtering/sorting/rendering share it.
// row is already normalized to {ticker, price, pct, vol, avgVolMAuto, floatMAuto,
// shortFloatPct, shortRatio} by the Finviz serverless function's shapeRow.
function scannerRowData(row){
  const { ticker, price, pct, vol } = row;
  const manual = getScannerManual()[ticker] || {};
  const newsEntry = getScannerNewsToday(ticker);
  const catalystType = manual.catalystType || '';
  const newsOk = scannerNewsOk(newsEntry, catalystType);
  // A manual entry always overrides the automatic (Finviz-derived) value, in
  // case the user has more current or more accurate data than the API.
  const floatM = manual.float != null && manual.float !== '' ? parseFloat(manual.float) : row.floatMAuto;
  const avgVolM = manual.avgVol != null && manual.avgVol !== '' ? parseFloat(manual.avgVol) : row.avgVolMAuto;
  // Relative volume = today's volume / the ticker's own average daily volume,
  // the real "5x average" the Toolkit means.
  const relVol = (avgVolM != null && avgVolM > 0) ? (vol / (avgVolM * 1e6)) : null;
  const pillarCount = scannerPillars(price, pct, vol, newsOk, floatM, relVol);
  // Float rotation = today's volume / float. A stock trading multiples of
  // its own float (rotation well above 1x) is the classic sign of a real
  // supply/demand imbalance.
  const floatRotation = (floatM != null && floatM > 0) ? (vol / (floatM * 1e6)) : null;
  return { row, ticker, price, pct, vol, manual, newsEntry, newsOk, catalystType, floatM, avgVolM, relVol, floatRotation, pillarCount, shortFloatPct: row.shortFloatPct, shortRatio: row.shortRatio, watched: isScannerWatched(ticker) };
}

const CATALYST_OPTIONS_HTML = '<option value="">News? (pick a catalyst)</option>' +
  Object.entries(CATALYST_TYPES).map(([val, info]) => `<option value="${val}">${info.good ? '' : '⚠ '}${info.label}</option>`).join('');

function scannerRowHtml(data, rank){
  const { ticker, price, pct, vol, manual, newsEntry, catalystType, floatM, avgVolM, relVol, floatRotation, pillarCount, shortFloatPct, shortRatio, watched } = data;
  const shortTitle = shortRatio != null ? `Short ratio (days to cover): ${shortRatio.toFixed(2)}` : '';
  const newsCellHtml = newsEntry ? scannerNewsBadgeHtml(newsEntry) : '';
  const catalystBadge = scannerCatalystBadgeHtml(catalystType);
  const rankBadge = rank === 1 ? '&#127942;' : (rank <= 3 ? '&#129352;' : '');
  const rowTint = rank <= 3 ? 'background:var(--good-soft);' : (rank <= 10 ? 'background:var(--accent-soft);' : '');
  return `<tr data-ticker="${ticker}" style="${rowTint}">
    <td class="mono num" style="font-weight:700;">${rankBadge} ${rank}</td>
    <td class="num ${pct>=0?'good':'bad'}" style="font-weight:700;">${pct>=0?'+':''}${pct.toFixed(2)}%</td>
    <td>
      <div class="mono" style="font-weight:700;">${ticker}${watched ? ' <span class="pill neutral">watching</span>' : ''}</div>
      <div style="margin-top:4px;display:flex;gap:4px;flex-wrap:wrap;align-items:center;">
        ${newsCellHtml}${catalystBadge}
        <button type="button" class="btn sc-check-news" data-ticker="${ticker}" style="padding:2px 6px;font-size:10px;">Check news</button>
      </div>
      <select class="sc-catalyst-select" data-ticker="${ticker}" style="margin-top:4px;font-size:11px;padding:3px 4px;border-radius:6px;border:1px solid var(--line);background:var(--surface-2);color:var(--ink);max-width:190px;">
        ${CATALYST_OPTIONS_HTML.replace(`value="${catalystType}"`, `value="${catalystType}" selected`)}
      </select>
    </td>
    <td class="num">$${price.toFixed(2)}</td>
    <td class="num">${vol.toLocaleString()}</td>
    <td>
      <input type="number" step="any" class="sc-avgvol-input" data-ticker="${ticker}" value="${avgVolM!=null?avgVolM:''}" placeholder="avg vol (M)" style="width:80px;min-height:32px;border:1px solid var(--line);border-radius:8px;padding:4px 6px;background:var(--surface-2);color:var(--ink);">
      <div class="num" style="font-size:11px;margin-top:2px;${relVol!=null && relVol>=5 ? 'color:var(--good);font-weight:700;' : ''}">${relVol!=null ? relVol.toFixed(1)+'x' : '—'}</div>
    </td>
    <td><input type="number" step="any" class="sc-float-input" data-ticker="${ticker}" value="${floatM!=null?floatM:''}" placeholder="e.g. 8" style="width:70px;min-height:32px;border:1px solid var(--line);border-radius:8px;padding:4px 6px;background:var(--surface-2);color:var(--ink);"></td>
    <td class="num">${floatRotation!=null ? floatRotation.toFixed(1)+'x' : '—'}</td>
    <td class="num" title="${shortTitle}">${shortFloatPct!=null ? shortFloatPct.toFixed(1)+'%' : '—'}</td>
    <td><span class="pill ${pillarCount===5?'good':'neutral'}">${pillarCount}/5</span></td>
    <td style="display:flex;flex-direction:column;gap:4px;">
      <button type="button" class="btn sc-watch-toggle" data-ticker="${ticker}" style="padding:4px 8px;font-size:11px;">${watched ? '★ Watching' : '☆ Watch'}</button>
      <button class="btn" style="padding:4px 8px;font-size:11px;" onclick="__logScannerTrade('${ticker}', ${price}, ${pct})">Log trade</button>
    </td>
  </tr>`;
}
function renderScannerTables(){
  const cache = lsGet(SCANNER_CACHE_KEY, null);
  const gainersBody = document.getElementById('scan-gainers-tbody');
  const activeBody = document.getElementById('scan-active-tbody');
  const gainersEmpty = document.getElementById('scan-gainers-empty');
  const activeEmpty = document.getElementById('scan-active-empty');
  if(!cache){ gainersBody.innerHTML=''; activeBody.innerHTML=''; gainersEmpty.hidden=false; activeEmpty.hidden=false; scannerUpdateSortIndicators(); return; }
  const watchOnly = document.getElementById('sc-watch-filter').dataset.value === 'watch';
  let gainers = (cache.top_gainers||[]).filter(scannerFilterRow).map(scannerRowData);
  let active = (cache.most_actively_traded||[]).filter(scannerFilterRow).map(scannerRowData);
  if(watchOnly){ gainers = gainers.filter(d => d.watched); active = active.filter(d => d.watched); }
  gainers = scannerSortRows(gainers, 'gainers');
  active = scannerSortRows(active, 'active');
  gainersBody.innerHTML = gainers.map((d,i) => scannerRowHtml(d, i+1)).join('');
  activeBody.innerHTML = active.map((d,i) => scannerRowHtml(d, i+1)).join('');
  gainersEmpty.hidden = gainers.length > 0;
  activeEmpty.hidden = active.length > 0;
  scannerUpdateSortIndicators();
}
// Catalyst select / Float input / Avg-vol input / Check news / Watch buttons
// are re-created on every render, so wire them via delegated listeners on
// the tbody rather than per-element.
['scan-gainers-tbody','scan-active-tbody'].forEach(id => {
  const tbody = document.getElementById(id);
  tbody.addEventListener('change', (e) => {
    if(e.target.matches('.sc-catalyst-select')){
      setScannerManualField(e.target.dataset.ticker, 'catalystType', e.target.value || null);
      renderScannerTables();
    } else if(e.target.matches('.sc-float-input')){
      const v = e.target.value.trim();
      setScannerManualField(e.target.dataset.ticker, 'float', v === '' ? null : parseFloat(v));
      renderScannerTables();
    } else if(e.target.matches('.sc-avgvol-input')){
      const v = e.target.value.trim();
      setScannerManualField(e.target.dataset.ticker, 'avgVol', v === '' ? null : parseFloat(v));
      renderScannerTables();
    }
  });
  tbody.addEventListener('click', (e) => {
    const checkBtn = e.target.closest('.sc-check-news');
    if(checkBtn){ checkScannerNews(checkBtn.dataset.ticker); return; }
    const watchBtn = e.target.closest('.sc-watch-toggle');
    if(watchBtn){ toggleScannerWatch(watchBtn.dataset.ticker); renderScannerTables(); return; }
  });
});
window.__logScannerTrade = function(ticker, price, pctGain){
  showPage('journal');
  document.getElementById('f-instrument').value = ticker;
  document.getElementById('f-tags').value = 'from-scanner';
  if(pctGain != null && !isNaN(pctGain)) document.getElementById('f-pctgain').value = Math.abs(pctGain);
  const manual = getScannerManual()[ticker] || {};
  const newsToday = getScannerNewsToday(ticker);
  const newsIsFresh = scannerNewsOk(newsToday, manual.catalystType || '');
  if(newsIsFresh){
    const group = document.getElementById('f-news');
    group.dataset.value = 'true';
    group.querySelectorAll('.seg-btn').forEach(b => b.classList.toggle('active', b.dataset.value === 'true'));
  }
  if(manual.float != null) document.getElementById('f-float').value = manual.float;
  document.getElementById('f-instrument').scrollIntoView({behavior:'smooth', block:'center'});
};
renderScannerTables();
