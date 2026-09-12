import { lsGet, lsSet } from './state.js';
import { initSegmented } from './journal.js';
import { showPage } from './nav.js';

// ---------- Scanner (Alpha Vantage TOP_GAINERS_LOSERS, free-tier, cached) ----------
const AV_CACHE_KEY = 'tc-scanner-cache';
document.getElementById('av-key').value = lsGet('tc-av-key', '');
document.getElementById('av-key').addEventListener('change', (e) => lsSet('tc-av-key', e.target.value.trim()));
['sc-minprice','sc-maxprice','sc-minpct','sc-minvol'].forEach(id => {
  document.getElementById(id).addEventListener('input', renderScannerTables);
});

function scannerStatus(msg){ document.getElementById('scanner-status').textContent = msg; }

// Normalizes Alpha Vantage's raw TOP_GAINERS_LOSERS row shape (string
// fields, no float/avg-volume) into the same shape the FMP-backed path
// produces, so filtering/sorting/rendering downstream never need to know
// which data source a row came from.
function normalizeAvRow(raw){
  return {
    ticker: raw.ticker,
    price: parseFloat(raw.price),
    pct: parseFloat((raw.change_percentage||'0').replace('%','')),
    vol: Number(raw.volume),
    avgVolMAuto: null,
    floatMAuto: null,
  };
}

async function refreshScannerFmp(){
  scannerStatus('Fetching top gainers / most active from the upgraded scanner…');
  try{
    const res = await fetch('/api/scanner-gainers');
    const data = await res.json();
    if(data.configured === false) return false;
    if(data.error){ scannerStatus(`${data.error} Showing last cached scan if available.`); return true; }
    lsSet(AV_CACHE_KEY, { fetchedAt: data.fetchedAt, source: 'fmp', top_gainers: data.top_gainers||[], most_actively_traded: data.most_actively_traded||[] });
    scannerStatus(`Scan updated ${new Date(data.fetchedAt).toLocaleTimeString()} — live scanner (float & relative volume computed automatically).`);
    renderScannerTables();
    return true;
  }catch(err){
    scannerStatus('Could not reach the upgraded scanner endpoint. Showing last cached scan if available.');
    return true; // it was configured, just failed — don't silently fall back to Alpha Vantage
  }
}

async function refreshScannerAv(){
  const key = document.getElementById('av-key').value.trim();
  if(!key){ scannerStatus('Add your free Alpha Vantage API key above first.'); return; }
  scannerStatus('Fetching top gainers / most active from Alpha Vantage…');
  try{
    const res = await fetch(`https://www.alphavantage.co/query?function=TOP_GAINERS_LOSERS&apikey=${encodeURIComponent(key)}`);
    const data = await res.json();
    if(data.Note || data.Information){
      scannerStatus((data.Note || data.Information) + ' Showing last cached scan if available.');
      renderScannerTables();
      return;
    }
    lsSet(AV_CACHE_KEY, {
      fetchedAt: Date.now(),
      source: 'av',
      top_gainers: (data.top_gainers||[]).map(normalizeAvRow),
      most_actively_traded: (data.most_actively_traded||[]).map(normalizeAvRow),
    });
    scannerStatus(`Scan updated ${new Date().toLocaleTimeString()}. Data is delayed/end-of-run, not live tick data.`);
    renderScannerTables();
  }catch(err){
    scannerStatus('Could not reach Alpha Vantage — check your key and connection.');
  }
}

// Tries the upgraded (FMP-backed) scanner first; only falls back to the
// free Alpha Vantage flow when the server reports FMP_API_KEY isn't set.
async function refreshScanner(){
  const usedFmp = await refreshScannerFmp();
  if(!usedFmp) await refreshScannerAv();
}
document.getElementById('scanner-refresh').addEventListener('click', refreshScanner);

function scannerFilterRow(row){
  const minP = parseFloat(document.getElementById('sc-minprice').value) || 0;
  const maxP = parseFloat(document.getElementById('sc-maxprice').value) || Infinity;
  const minPct = parseFloat(document.getElementById('sc-minpct').value) || 0;
  const minVol = parseFloat(document.getElementById('sc-minvol').value) || 0;
  return row.price >= minP && row.price <= maxP && Math.abs(row.pct) >= minPct && row.vol >= minVol;
}
// Manual per-ticker News/Float entries — Alpha Vantage's free TOP_GAINERS_LOSERS
// endpoint has no float or true relative-volume data, so those 2 pillars are
// filled in by hand and kept in localStorage (session-durable, not synced).
// News now also has a REAL per-ticker freshness check (see NEWS_CACHE_KEY below);
// the manual checkbox here is the fallback for tickers not checked today.
const SCANNER_MANUAL_KEY = 'tc-scanner-manual';
function getScannerManual(){ return lsGet(SCANNER_MANUAL_KEY, {}); }
function setScannerManualField(ticker, field, value){
  const manual = getScannerManual();
  manual[ticker] = {...(manual[ticker]||{}), [field]: value};
  lsSet(SCANNER_MANUAL_KEY, manual);
}
const SCANNER_VOL_PILLAR_MIN = 500000; // rough liquidity proxy, NOT true relative volume
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
  // Real relative volume (user-entered avg volume) takes priority; falls back
  // to the crude liquidity-proxy threshold when no average volume is on file.
  const volOk = relVol != null ? relVol >= SCANNER_RELVOL_PILLAR_MIN : vol >= SCANNER_VOL_PILLAR_MIN;
  const floatOk = floatM != null && floatM < 20;
  const count = [priceOk, gainOk, volOk, newsOk, floatOk].filter(Boolean).length;
  return count;
}

// ---------- Scanner: real news freshness (Alpha Vantage NEWS_SENTIMENT, cached per ticker per day) ----------
// Free-tier keys are tightly rate-limited, so this is NEVER auto-fetched for
// rows on render — only an explicit "Check news" click calls the endpoint,
// and the result is cached per ticker+date so revisiting/re-rendering the
// page the same day never re-calls it.
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
// Alpha Vantage time_published is "YYYYMMDDTHHMMSS" in UTC, no separators —
// Date.parse() does not reliably handle this format, so parse it by hand.
function parseAvNewsTimestamp(ts){
  if(!ts || typeof ts !== 'string' || ts.length < 15) return null;
  const y = +ts.slice(0,4), mo = +ts.slice(4,6) - 1, d = +ts.slice(6,8);
  const h = +ts.slice(9,11), mi = +ts.slice(11,13), s = +ts.slice(13,15);
  const ms = Date.UTC(y, mo, d, h, mi, s);
  return isNaN(ms) ? null : ms;
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
  if(entry.hoursOld == null) return `<span class="pill" title="No recent articles from Alpha Vantage's news feed">no news found</span>`;
  const b = scannerFreshnessBucket(entry.hoursOld);
  const title = entry.headline ? entry.headline.replace(/"/g,'&quot;') : '';
  return `<span class="pill ${b.cls}" title="${title}">${b.icon} ${b.label} old</span>`;
}
async function checkScannerNewsFinnhub(ticker){
  try{
    const res = await fetch(`/api/scanner-news?symbol=${encodeURIComponent(ticker)}`);
    const data = await res.json();
    if(data.configured === false) return false;
    if(data.error){ scannerStatus(`${data.error} News check for ${ticker} not completed.`); return true; }
    setScannerNewsCacheEntry(ticker, { checkedAt: Date.now(), hoursOld: data.hoursOld, headline: data.headline, url: null });
    scannerStatus(data.hoursOld != null
      ? `${ticker}: latest news is ~${data.hoursOld.toFixed(1)}h old (checked just now, cached for today).`
      : `No recent news found for ${ticker} (checked just now, cached for today).`);
    renderScannerTables();
    return true;
  }catch(err){
    scannerStatus(`Could not reach the news endpoint for ${ticker}.`);
    return true;
  }
}

async function checkScannerNewsAv(ticker){
  const key = document.getElementById('av-key').value.trim();
  if(!key){ scannerStatus('Add your free Alpha Vantage API key above first.'); return; }
  scannerStatus(`Checking news freshness for ${ticker}…`);
  try{
    const res = await fetch(`https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=${encodeURIComponent(ticker)}&apikey=${encodeURIComponent(key)}&limit=3&sort=LATEST`);
    const data = await res.json();
    if(data.Note || data.Information){
      scannerStatus((data.Note || data.Information) + ` News check for ${ticker} not completed.`);
      return;
    }
    const feed = Array.isArray(data.feed) ? data.feed : [];
    if(feed.length === 0){
      setScannerNewsCacheEntry(ticker, { checkedAt: Date.now(), hoursOld: null, headline: null, url: null });
      scannerStatus(`No recent news found for ${ticker} (checked just now, cached for today).`);
    } else {
      const latest = feed[0];
      const ts = parseAvNewsTimestamp(latest.time_published);
      const hoursOld = ts != null ? (Date.now() - ts) / 3600000 : null;
      setScannerNewsCacheEntry(ticker, { checkedAt: Date.now(), hoursOld, headline: latest.title || null, url: latest.url || null });
      scannerStatus(hoursOld != null
        ? `${ticker}: latest news is ~${hoursOld.toFixed(1)}h old (checked just now, cached for today).`
        : `${ticker}: found news but couldn't parse its timestamp (checked just now, cached for today).`);
    }
    renderScannerTables();
  }catch(err){
    scannerStatus(`Could not reach Alpha Vantage for ${ticker}'s news.`);
  }
}

async function checkScannerNews(ticker){
  scannerStatus(`Checking news freshness for ${ticker}…`);
  const usedFinnhub = await checkScannerNewsFinnhub(ticker);
  if(!usedFinnhub) await checkScannerNewsAv(ticker);
}

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
        default: return d.pillarCount;
      }
    };
    return state.dir * (pick(a) - pick(b));
  });
  return sorted;
}

// Computes all derived per-row fields once so filtering/sorting/rendering share it.
// row is already normalized (see normalizeAvRow / the FMP serverless function's
// shapeRow) to {ticker, price, pct, vol, avgVolMAuto, floatMAuto}.
function scannerRowData(row){
  const { ticker, price, pct, vol } = row;
  const manual = getScannerManual()[ticker] || {};
  const newsEntry = getScannerNewsToday(ticker);
  const catalystType = manual.catalystType || '';
  const newsOk = scannerNewsOk(newsEntry, catalystType);
  // A manual entry always overrides the automatic (FMP-derived) value, in
  // case the user has more current or more accurate data than the API.
  const floatM = manual.float != null && manual.float !== '' ? parseFloat(manual.float) : row.floatMAuto;
  const avgVolM = manual.avgVol != null && manual.avgVol !== '' ? parseFloat(manual.avgVol) : row.avgVolMAuto;
  // Relative volume = today's volume / the ticker's own average daily volume,
  // the real "5x average" the Toolkit means — automatic when the upgraded
  // (FMP) scanner is configured, otherwise computable once entered by hand.
  const relVol = (avgVolM != null && avgVolM > 0) ? (vol / (avgVolM * 1e6)) : null;
  const pillarCount = scannerPillars(price, pct, vol, newsOk, floatM, relVol);
  // Float rotation = today's volume / float. A stock trading multiples of
  // its own float (rotation well above 1x) is the classic sign of a real
  // supply/demand imbalance. Automatic (FMP) or manually entered.
  const floatRotation = (floatM != null && floatM > 0) ? (vol / (floatM * 1e6)) : null;
  return { row, ticker, price, pct, vol, manual, newsEntry, newsOk, catalystType, floatM, avgVolM, relVol, floatRotation, pillarCount, watched: isScannerWatched(ticker) };
}

const CATALYST_OPTIONS_HTML = '<option value="">News? (pick a catalyst)</option>' +
  Object.entries(CATALYST_TYPES).map(([val, info]) => `<option value="${val}">${info.good ? '' : '⚠ '}${info.label}</option>`).join('');

function scannerRowHtml(data, rank){
  const { ticker, price, pct, vol, manual, newsEntry, catalystType, floatM, avgVolM, relVol, floatRotation, pillarCount, watched } = data;
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
    <td><span class="pill ${pillarCount===5?'good':'neutral'}">${pillarCount}/5</span></td>
    <td style="display:flex;flex-direction:column;gap:4px;">
      <button type="button" class="btn sc-watch-toggle" data-ticker="${ticker}" style="padding:4px 8px;font-size:11px;">${watched ? '★ Watching' : '☆ Watch'}</button>
      <button class="btn" style="padding:4px 8px;font-size:11px;" onclick="__logScannerTrade('${ticker}', ${price}, ${pct})">Log trade</button>
    </td>
  </tr>`;
}
function renderScannerTables(){
  const cache = lsGet(AV_CACHE_KEY, null);
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
  if(!document.getElementById('scanner-status').textContent){
    scannerStatus(`Showing cached scan from ${new Date(cache.fetchedAt).toLocaleString()}.`);
  }
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
