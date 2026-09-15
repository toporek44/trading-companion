import { lsGet, lsSet, persistProgress, SUPABASE_URL, SUPABASE_ANON_KEY, escapeHtml, getScannerPriceRange, csvEscape, downloadCsv } from './state.js';
export { escapeHtml, csvEscape, downloadCsv };
import { initSegmented } from './journal.js';
import { showPage } from './nav.js';

// ---------- Scanner (Finviz Elite + Finnhub, server-side, auto-refreshing) ----------
// No manual API key ever needed here — FINVIZ_API_KEY / FINHUB_API_KEY are
// configured server-side (Vercel env vars). If either isn't set, the
// relevant feature just reports a clear "not configured" status instead
// of silently doing nothing.
const SCANNER_CACHE_KEY = 'tc-scanner-cache';
const AUTO_REFRESH_MS = 60000; // 60s — frequent enough to catch a fresh mover quickly without hammering the API; also the cadence alerts will piggyback on.

// Price range is edited once here (Min/Max price fields below) and synced
// to Supabase under key 'scanner-price-range' so the server-side Telegram
// alert function (api/check-alerts.js, which has no browser/localStorage)
// and the live-fetch filter (api/scanner-gainers.js) both read the same
// value — one source of truth instead of separately hardcoded copies.
// $2-$20 matches Ross Cameron's own stated range in the reference video.
const PRICE_RANGE_KEY = 'scanner-price-range';
const TOP_PICKS_COUNT_KEY = 'tc-scanner-top-picks-count';
async function loadPriceRangeSetting(){
  const { min, max } = await getScannerPriceRange();
  document.getElementById('sc-minprice').value = min;
  document.getElementById('sc-maxprice').value = max;
  // This resolves asynchronously (a Supabase fetch), racing the initial
  // renderScannerTables() call at module load — without this, a saved
  // custom range wouldn't visibly apply until the next 60s auto-refresh
  // tick re-reads the (by-then-updated) input values.
  renderScannerTables();
}
function savePriceRangeSetting(){
  const min = parseFloat(document.getElementById('sc-minprice').value);
  const max = parseFloat(document.getElementById('sc-maxprice').value);
  persistProgress(PRICE_RANGE_KEY, { min: isNaN(min)?null:min, max: isNaN(max)?null:max });
}
loadPriceRangeSetting();

['sc-minprice','sc-maxprice','sc-minpct','sc-minvol'].forEach(id => {
  document.getElementById(id).addEventListener('input', renderScannerTables);
});

// Top Picks count — a per-browser display preference (how many, not what
// data), same tier as the Cards/Heatmap view toggle, so plain localStorage
// is fine; no Supabase sync needed.
document.getElementById('scanner-top-picks-count').value = lsGet(TOP_PICKS_COUNT_KEY, '3');
document.getElementById('scanner-top-picks-count').addEventListener('change', (e) => {
  lsSet(TOP_PICKS_COUNT_KEY, e.target.value);
  renderScannerTopPicks();
});
document.getElementById('sc-minprice').addEventListener('change', savePriceRangeSetting);
document.getElementById('sc-maxprice').addEventListener('change', savePriceRangeSetting);

// Reset to defaults — a saved preset can leave min%/minvol on values a
// user forgets are non-default (those two fields aren't persisted, but
// price range is, via savePriceRangeSetting), and there was previously no
// one-click way back to the worksheet's own $2-$20/10%/500k baseline
// without knowing those numbers by heart. Mirrors the Journal's own
// "Clear filters" button.
const SCANNER_FILTER_DEFAULTS = { 'sc-minprice': '2', 'sc-maxprice': '20', 'sc-minpct': '10', 'sc-minvol': '500000' };
document.getElementById('sc-filters-reset').addEventListener('click', () => {
  Object.entries(SCANNER_FILTER_DEFAULTS).forEach(([id, val]) => { document.getElementById(id).value = val; });
  document.getElementById('sc-preset-select').value = '';
  savePriceRangeSetting();
  renderScannerTables();
  scannerStatus('Filters reset to defaults.');
});

// ---------- Scanner: saved filter presets ----------
// Every pro scanner tool (TC2000's EasyScan, TradingView, Trade Ideas) lets
// you save a named filter combo and switch instantly instead of re-typing
// four fields. Synced via the same Supabase 'progress' table/pattern as the
// price-range setting above — one array of {name,min,max,minpct,minvol}.
const PRESETS_KEY = 'scanner-presets';
const PRESET_FIELD_IDS = { min: 'sc-minprice', max: 'sc-maxprice', minpct: 'sc-minpct', minvol: 'sc-minvol' };
let scannerPresets = [];

function renderPresetOptions(){
  const select = document.getElementById('sc-preset-select');
  const current = select.value;
  select.innerHTML = '<option value="">Load a preset&hellip;</option>' +
    scannerPresets.map(p => `<option value="${escapeHtml(p.name)}">${escapeHtml(p.name)}</option>`).join('');
  if(scannerPresets.some(p => p.name === current)) select.value = current;
}
async function loadScannerPresets(){
  try{
    const res = await fetch(`${SUPABASE_URL}/rest/v1/progress?key=eq.${PRESETS_KEY}&select=state`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    });
    const rows = await res.json();
    const s = Array.isArray(rows) && rows[0] && rows[0].state;
    scannerPresets = Array.isArray(s) ? s : [];
  }catch(e){ scannerPresets = []; }
  renderPresetOptions();
}
loadScannerPresets();

document.getElementById('sc-preset-select').addEventListener('change', (e) => {
  const preset = scannerPresets.find(p => p.name === e.target.value);
  if(!preset) return;
  Object.entries(PRESET_FIELD_IDS).forEach(([field, id]) => {
    if(preset[field] != null) document.getElementById(id).value = preset[field];
  });
  savePriceRangeSetting();
  renderScannerTables();
  scannerStatus(`Loaded preset "${preset.name}".`);
});
document.getElementById('sc-preset-save').addEventListener('click', () => {
  const name = (prompt('Name this preset (e.g. "Sweet spot $5-$10"):') || '').trim();
  if(!name) return;
  const values = {};
  Object.entries(PRESET_FIELD_IDS).forEach(([field, id]) => {
    const v = parseFloat(document.getElementById(id).value);
    values[field] = isNaN(v) ? null : v;
  });
  scannerPresets = [...scannerPresets.filter(p => p.name !== name), { name, ...values }];
  persistProgress(PRESETS_KEY, scannerPresets);
  renderPresetOptions();
  document.getElementById('sc-preset-select').value = name;
  scannerStatus(`Saved preset "${name}".`);
});
document.getElementById('sc-preset-delete').addEventListener('click', () => {
  const select = document.getElementById('sc-preset-select');
  const name = select.value;
  if(!name) return;
  scannerPresets = scannerPresets.filter(p => p.name !== name);
  persistProgress(PRESETS_KEY, scannerPresets);
  renderPresetOptions();
  scannerStatus(`Deleted preset "${name}".`);
});

function scannerStatus(msg){ document.getElementById('scanner-status').textContent = msg; }

// In-flight guard: without this, a slow response (network hiccup, a
// Finviz request taking >60s) could let the next 60s interval tick start a
// second overlapping request. If the older, slower one resolves after the
// newer one, it would silently overwrite fresh data with stale data.
let scannerRefreshInFlight = false;
async function refreshScanner(){
  if(scannerRefreshInFlight) return;
  scannerRefreshInFlight = true;
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
    checkScannerPriceAlerts([...(data.top_gainers||[]), ...(data.most_actively_traded||[])]);
    // Awaited (not fire-and-forget) so scannerRefreshInFlight stays true for
    // the full duration of this news-check sequence — otherwise clicking
    // "Refresh now" again mid-sequence could start a second concurrent pass
    // over the same tickers, racing on the same localStorage cache entries
    // (found by a later audit this session; same root cause as the outer
    // overlapping-refresh race already fixed above).
    await autoCheckTopNews((data.top_gainers||[]).map(r => r.ticker));
  }catch(err){
    scannerStatus('Could not reach the scanner endpoint. Showing last cached scan if available.');
  }finally{
    scannerRefreshInFlight = false;
  }
}
document.getElementById('scanner-refresh').addEventListener('click', refreshScanner);

// ---------- Scanner: sector performance (Finviz "Groups" export) ----------
// Sector aggregates move slowly over a trading day — a 5min cadence is
// plenty and spares Finviz Elite's per-request quota compared to the
// gainers/most-active 60s loop. Previously blocked (see
// docs/competitive-positioning.md's "real, informed gaps" — no verified
// Sector column ID); unblocked this session via the same "add a candidate,
// deploy, curl production" empirical pattern used for every other Finviz
// quirk here, not a guess.
const SECTOR_CACHE_KEY = 'tc-sector-cache';
const SECTOR_REFRESH_MS = 5 * 60 * 1000;
let sectorRefreshInFlight = false;
async function refreshSectors(){
  if(sectorRefreshInFlight) return;
  sectorRefreshInFlight = true;
  try{
    const res = await fetch('/api/scanner-sectors');
    const data = await res.json();
    if(data.configured === false || data.error || !Array.isArray(data.sectors)) return;
    lsSet(SECTOR_CACHE_KEY, { fetchedAt: data.fetchedAt, sectors: data.sectors });
    renderSectorPerformance();
    renderScannerTables(); // picks up each card's "how's its sector doing" line
  }catch(err){ /* best-effort — sector context is a bonus, not core scanner function */ }
  finally{ sectorRefreshInFlight = false; }
}
// Looked up per-card (by row.sector) to show "this stock vs. its own
// sector today" — a lightweight relative-strength cue without needing a
// full-market fetch to rank every sector against every other one.
function scannerSectorPerf(sectorName){
  if(!sectorName) return null;
  const cache = lsGet(SECTOR_CACHE_KEY, null);
  if(!cache) return null;
  return cache.sectors.find(s => s.name === sectorName) || null;
}
function renderSectorPerformance(){
  const card = document.getElementById('sc-sectors-card');
  const list = document.getElementById('sc-sectors-list');
  if(!card || !list) return;
  const cache = lsGet(SECTOR_CACHE_KEY, null);
  if(!cache || cache.sectors.length === 0){ card.hidden = true; return; }
  card.hidden = false;
  const sorted = cache.sectors.slice().sort((a,b) => (b.changeToday||0) - (a.changeToday||0));
  list.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:8px;">` + sorted.map(s => `
    <span class="pill ${s.changeToday>=0?'good':'bad'}" style="display:inline-flex;gap:6px;align-items:center;" title="Rel Vol: ${s.relVol!=null?s.relVol.toFixed(2)+'x':'—'}">
      ${escapeHtml(s.name)} <strong>${s.changeToday>=0?'+':''}${s.changeToday.toFixed(2)}%</strong>
    </span>`).join('') + `</div>`;
}
refreshSectors();
startVisibilityAwareRefresh(refreshSectors, SECTOR_REFRESH_MS);
refreshScanner(); // fetch immediately on load, don't wait for a click or the first interval tick
startVisibilityAwareRefresh(refreshScanner, AUTO_REFRESH_MS);

function scannerFilterRow(row){
  // Defense in depth: the server already excludes halted/no-trade tickers
  // (null pct/vol from Finviz's "-"), but this must never rely solely on
  // that — scannerRowHtml calls .toFixed()/.toLocaleString() on these
  // unguarded, and a null slipping through (e.g. a 0-valued min-pct/min-vol
  // preset) would throw and abort the whole render, not just skip one row.
  if(row.price == null || row.pct == null || row.vol == null) return false;
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

// Default $2-$20 matches Ross Cameron's own stated range in the reference
// video; overridden live by the Min/Max price fields (see
// loadPriceRangeSetting/savePriceRangeSetting above).
function scannerPriceRange(){
  const min = parseFloat(document.getElementById('sc-minprice').value);
  const max = parseFloat(document.getElementById('sc-maxprice').value);
  return { min: isNaN(min) ? 2 : min, max: isNaN(max) ? 20 : max };
}
// Returns each pillar's pass/fail plus the concrete number that decided it,
// so the UI can show *why* a ticker scored what it scored instead of just
// the bare count.
function scannerPillarBreakdown(price, pct, vol, newsOk, floatM, relVol, newsEntry){
  const { min, max } = scannerPriceRange();
  const priceOk = price >= min && price <= max;
  const gainOk = Math.abs(pct) >= 10;
  const volOk = relVol != null ? relVol >= SCANNER_RELVOL_PILLAR_MIN : vol >= SCANNER_VOL_PILLAR_MIN;
  const floatOk = floatM != null && floatM < 20;
  const newsDetail = newsEntry && newsEntry.hoursOld != null
    ? `${newsEntry.hoursOld.toFixed(1)}h old`
    : (newsOk ? 'manual catalyst tagged' : 'no fresh news / catalyst');
  return [
    { key: 'price', label: 'Price in range', ok: priceOk, detail: `$${price.toFixed(2)} (need $${min}-$${max})` },
    { key: 'gain', label: 'Up ≥10% today', ok: gainOk, detail: `${pct>=0?'+':''}${pct.toFixed(2)}%` },
    { key: 'relvol', label: 'Rel. volume ≥5x', ok: volOk, detail: relVol != null ? `${relVol.toFixed(1)}x avg` : `${vol.toLocaleString()} shares (no avg vol yet)` },
    { key: 'news', label: 'Fresh news/catalyst', ok: newsOk, detail: newsDetail },
    { key: 'float', label: 'Float <20M', ok: floatOk, detail: floatM != null ? `${floatM.toFixed(1)}M` : 'unknown (enter float)' },
  ];
}
function scannerPillars(price, pct, vol, newsOk, floatM, relVol){
  const { min, max } = scannerPriceRange();
  const priceOk = price >= min && price <= max;
  const gainOk = Math.abs(pct) >= 10;
  const volOk = relVol != null ? relVol >= SCANNER_RELVOL_PILLAR_MIN : vol >= SCANNER_VOL_PILLAR_MIN;
  const floatOk = floatM != null && floatM < 20;
  const count = [priceOk, gainOk, volOk, newsOk, floatOk].filter(Boolean).length;
  return count;
}

// "Setup grade" — a mechanical score built purely from the same 5 Pillars
// inputs already computed above (pillar count, how far relative volume
// clears the 5x bar, and whether news is genuinely fresh/breaking). This is
// NOT a buy/sell signal or a valuation call — there's no fundamentals or
// price-target model behind it — it's just a compressed read of "how many
// of Ross Cameron's own criteria does this fully clear, and by how much."
// Explicitly labeled "setup" (not "buy") to avoid implying investment advice.
function scannerSetupScore(pillarCount, relVol, newsEntry, catalystType){
  let score = pillarCount * 20;
  if(relVol != null) score += Math.min(relVol, 20);
  if(newsEntry && newsEntry.hoursOld != null && newsEntry.hoursOld < 2) score += 10;
  if(catalystType === 'merger') score -= 30; // dead catalyst — never a real setup regardless of score
  return score;
}
function scannerSetupGrade(pillarCount, relVol, newsEntry, catalystType){
  const score = scannerSetupScore(pillarCount, relVol, newsEntry, catalystType);
  if(score >= 115) return { grade: 'A+', label: 'Prime setup', cls: 'good', score };
  if(score >= 95) return { grade: 'A', label: 'Strong setup', cls: 'good', score };
  if(score >= 70) return { grade: 'B', label: 'Developing setup', cls: 'neutral', score };
  if(score >= 40) return { grade: 'C', label: 'Weak setup', cls: 'neutral', score };
  return { grade: 'D', label: 'Not a setup', cls: 'bad', score };
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
export function scannerFreshnessBucket(h){
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
  const count = (entry.items && entry.items.length > 1) ? ` (${entry.items.length})` : '';
  return `<span class="pill ${b.cls}" title="${title}">${b.icon} ${b.label} old${count}</span>`;
}
// Last-3-news panel: exact local date/time (not just a relative bucket) so
// results can be trusted and cross-checked, plus a direct link to the
// source article — this is the "why did this fire" evidence trail.
export function scannerNewsPanelHtml(ticker, entry){
  if(!entry){
    return `<div class="sc-news-empty" style="font-size:11px;color:var(--muted);padding:4px 0;">Not checked yet — click "Check news".</div>`;
  }
  if(!entry.items || entry.items.length === 0){
    return `<div class="sc-news-empty" style="font-size:11px;color:var(--muted);padding:4px 0;">Checked — no articles found in the last 3 days.</div>`;
  }
  return `<div class="sc-news-list" style="display:flex;flex-direction:column;gap:6px;padding:6px 0 2px;">${entry.items.map(item => {
    const b = scannerFreshnessBucket(item.hoursOld);
    const when = item.datetime ? new Date(item.datetime * 1000).toLocaleString() : '';
    const headline = escapeHtml(item.headline || '(no headline)');
    const source = item.source ? ` &middot; ${escapeHtml(item.source)}` : '';
    const body = `<span class="pill ${b.cls}" style="flex-shrink:0;">${b.icon} ${b.label}</span> <span style="font-size:12px;">${headline}</span><div style="font-size:10px;color:var(--muted);margin-top:2px;">${when}${source}</div>`;
    return item.url
      ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" style="display:flex;gap:6px;align-items:flex-start;text-decoration:none;color:inherit;">${body}</a>`
      : `<div style="display:flex;gap:6px;align-items:flex-start;">${body}</div>`;
  }).join('')}</div>`;
}
async function checkScannerNews(ticker, {silent} = {}){
  if(!silent) scannerStatus(`Checking news freshness for ${ticker}…`);
  try{
    const res = await fetch(`/api/scanner-news?symbol=${encodeURIComponent(ticker)}`);
    const data = await res.json();
    if(data.configured === false){ if(!silent) scannerStatus('News check not configured — FINHUB_API_KEY is not set on the server.'); return; }
    if(data.error){ if(!silent) scannerStatus(`${data.error} News check for ${ticker} not completed.`); return; }
    setScannerNewsCacheEntry(ticker, { checkedAt: Date.now(), hoursOld: data.hoursOld, headline: data.headline, items: data.items || [] });
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
// Audio alert — a two-tone chime synthesized with the Web Audio API, no
// sound file to fetch/host. Trade Ideas and Benzinga Pro both play a sound
// the instant a scan hits; a browser notification alone is easy to miss if
// this tab isn't focused. Best-effort: browsers require a prior user
// gesture to unlock audio, which "Enable alerts" already provides (it's a
// click), and a fresh AudioContext per alert avoids holding one open/
// suspended across the whole session.
function playScannerAlertChime(){
  try{
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = 'sine';
      const start = ctx.currentTime + i * 0.14;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.24);
    });
    setTimeout(() => ctx.close(), 600);
  }catch(err){ /* Web Audio unsupported/blocked — alert still shows visually */ }
}
function fireScannerAlert(title, body){
  if(!scannerAlertsActive()) return;
  playScannerAlertChime();
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
// Lets a user check their volume/hear what it sounds like before relying
// on it for real — works regardless of whether alerts are enabled, since
// this is a deliberate manual preview, not a real triggered alert.
document.getElementById('scanner-alerts-test-sound').addEventListener('click', playScannerAlertChime);

// ---------- Scanner: recent server-side alerts (read-only view into the
// same Supabase state api/check-alerts.js uses for its own dedup) ----------
// Key format is "cond:TICKER" (see api/check-alerts.js) where cond is
// "pillars5" or "freshnews". Only today's fired state is ever kept (the
// server resets the whole row once the date rolls over), so this is
// necessarily a same-day view, not a historical alert log.
const ALERT_COND_LABELS = { pillars5: '5/5 Pillars', freshnews: 'Fresh news (<2h)' };
async function loadRecentAlerts(){
  const container = document.getElementById('scanner-recent-alerts');
  if(!container) return;
  try{
    const res = await fetch(`${SUPABASE_URL}/rest/v1/progress?key=eq.telegram-alerts-fired&select=state`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    });
    const rows = await res.json();
    const state = Array.isArray(rows) && rows[0] && rows[0].state;
    const fired = (state && state.fired) || {};
    // Values are a timestamp (ms since epoch) going forward, but entries
    // written before this change are the bare boolean `true` — handle both
    // rather than assuming every row in production already has the new shape.
    const entries = Object.entries(fired).map(([key, value]) => {
      const [cond, ...rest] = key.split(':');
      const firedAtMs = typeof value === 'number' ? value : null;
      return { cond, ticker: rest.join(':'), firedAtMs };
    }).sort((a, b) => (b.firedAtMs||0) - (a.firedAtMs||0));
    if(entries.length === 0){
      container.innerHTML = `<p style="color:var(--muted);font-size:.85rem;margin:0;">No alerts fired yet today.</p>`;
      return;
    }
    const relTime = (ms) => {
      if(ms == null) return 'earlier today';
      const mins = Math.round((Date.now() - ms) / 60000);
      if(mins < 1) return 'just now';
      if(mins < 60) return `${mins}m ago`;
      return `${Math.floor(mins/60)}h ${mins%60}m ago`;
    };
    container.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:6px;">${entries.map(e =>
      `<span class="pill good" title="${escapeHtml(ALERT_COND_LABELS[e.cond] || e.cond)} &middot; ${relTime(e.firedAtMs)}">${escapeHtml(e.ticker)} &middot; ${escapeHtml(ALERT_COND_LABELS[e.cond] || e.cond)} &middot; ${relTime(e.firedAtMs)}</span>`
    ).join('')}</div>`;
  }catch(err){
    container.innerHTML = `<p style="color:var(--muted);font-size:.85rem;margin:0;">Could not load recent alerts.</p>`;
  }
}
loadRecentAlerts();
startVisibilityAwareRefresh(loadRecentAlerts, AUTO_REFRESH_MS); // stays in sync as the server-side check (every 2min) fires new ones

// ---------- Scanner: watchlist (localStorage, ticker array) ----------
const SCANNER_WATCHLIST_KEY = 'tc-scanner-watchlist';
export function getScannerWatchlist(){ return lsGet(SCANNER_WATCHLIST_KEY, []); }
export function isScannerWatched(ticker){ return getScannerWatchlist().includes(ticker); }
export function toggleScannerWatch(ticker){
  const list = getScannerWatchlist();
  const idx = list.indexOf(ticker);
  if(idx >= 0) list.splice(idx, 1); else list.push(ticker);
  lsSet(SCANNER_WATCHLIST_KEY, list);
  renderScannerWatchlistManager();
  // Same cross-tab staleness concern as price alerts (see
  // notifyScannerPriceAlertsChanged) — removing a crypto watch star from
  // this manager while the Crypto tab is hidden would otherwise leave its
  // ★ stale until the next 60s auto-refresh.
  document.dispatchEvent(new CustomEvent('sc-watchlist-changed'));
}
// A cross-market "my watchlist" panel (TC2000/Trade Ideas/Webull all have a
// persistent watchlist view) — until now the star was only a per-tab filter
// toggle, with no single place to see every starred symbol across markets
// at a glance. Reads both caches fresh from localStorage on every render
// rather than importing from crypto-scanner.js (which itself imports from
// this file — importing back would be circular), so 'tc-crypto-cache' is
// duplicated here as a literal; keep it in sync with crypto-scanner.js's
// own CRYPTO_CACHE_KEY if that ever changes. Futures has no watchlist by
// design (see CLAUDE.md — a fixed 14-contract list doesn't need one).
function scannerWatchlistRows(){
  const watched = getScannerWatchlist();
  if(watched.length === 0) return [];
  const stockCache = lsGet(SCANNER_CACHE_KEY, null);
  const cryptoCache = lsGet('tc-crypto-cache', null);
  const stockRows = stockCache ? [...(stockCache.top_gainers||[]), ...(stockCache.most_actively_traded||[])] : [];
  const cryptoRows = cryptoCache ? [...(cryptoCache.top_gainers||[]), ...(cryptoCache.most_active||[])] : [];
  return watched.map(key => {
    if(key.startsWith('crypto:')){
      const symbol = key.slice(7);
      const row = cryptoRows.find(r => r.symbol === symbol);
      return { key, market: 'crypto', label: 'Crypto', symbol, price: row?.price, pct: row?.pct };
    }
    const row = stockRows.find(r => r.ticker === key);
    return { key, market: 'stocks', label: 'Stocks', symbol: key, price: row?.price, pct: row?.pct };
  });
}
export function renderScannerWatchlistManager(){
  const card = document.getElementById('sc-watchlist-manager-card');
  const list = document.getElementById('sc-watchlist-manager-list');
  if(!card || !list) return;
  const rows = scannerWatchlistRows();
  card.hidden = rows.length === 0;
  if(rows.length === 0) return;
  list.innerHTML = rows.map(r => {
    const priceHtml = r.price != null
      ? `<span class="mono">$${r.price < 1 ? r.price.toPrecision(4) : r.price.toFixed(2)}</span> <span class="num ${r.pct>=0?'good':'bad'}">${r.pct!=null ? (r.pct>=0?'+':'')+r.pct.toFixed(2)+'%' : ''}</span>`
      : `<span style="color:var(--muted);font-size:.85rem;">not in today's Top Movers/Gainers &mdash; last known price unavailable</span>`;
    return `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--line);">
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
        <span class="pill neutral">${r.label}</span>
        <span class="mono" style="font-weight:700;">${escapeHtml(r.symbol)}</span>
        ${priceHtml}
      </div>
      <div style="display:flex;gap:8px;">
        <button type="button" class="btn sc-watch-mgr-jump" data-market="${r.market}" style="padding:4px 10px;font-size:11px;">Jump</button>
        <button type="button" class="btn sc-watch-mgr-remove" data-key="${escapeHtml(r.key)}" style="padding:4px 10px;font-size:11px;">Remove</button>
      </div>
    </div>`;
  }).join('');
}
document.getElementById('sc-watchlist-manager-list')?.addEventListener('click', (e) => {
  const jumpBtn = e.target.closest('.sc-watch-mgr-jump');
  if(jumpBtn){ document.querySelector(`#sc-market-tabs .seg-btn[data-value="${jumpBtn.dataset.market}"]`)?.click(); return; }
  const removeBtn = e.target.closest('.sc-watch-mgr-remove');
  if(removeBtn) toggleScannerWatch(removeBtn.dataset.key);
});

// Per-ticker free-text notes — TC2000's watchlist context menu lets you
// write notes per ticker (entry plan, why you're watching it); this is the
// text-only version of that (no charting surface here to attach a snapshot
// to). Kept in localStorage alongside the watchlist itself, not synced to
// Supabase — matches the watchlist's own persistence tier rather than
// introducing an inconsistent "notes sync but watchlist doesn't" split.
const SCANNER_NOTES_KEY = 'tc-scanner-notes';
export function getScannerNote(ticker){ return lsGet(SCANNER_NOTES_KEY, {})[ticker] || ''; }
export function setScannerNote(ticker, text){
  const notes = lsGet(SCANNER_NOTES_KEY, {});
  if(text) notes[ticker] = text; else delete notes[ticker];
  lsSet(SCANNER_NOTES_KEY, notes);
}
// Per-ticker price target alerts — thinkorswim/TC2000/Webull all have this
// as a core feature; this app only had condition-based alerts (5/5 Pillars,
// fresh news) until now, nothing for "tell me when XYZ crosses $N." Reuses
// the existing browser-notification/chime infra (fireScannerAlert) rather
// than a new channel. Localstorage-only, same tier as watchlist/notes above
// — no server-side cron support since check-alerts.js only ever scans the
// Finviz gainers/most-active universe, not arbitrary held tickers.
// Unlike the daily-reset Pillars/news alerts, a price target is a one-shot
// event: once crossed, it fires once and is removed from the list (a
// trader doesn't want the same crossing renotifying every 60s refresh).
// `key` is the ticker for Stocks, and the same "crypto:SYMBOL"/
// "futures:SYMBOL" prefixed key the notes/watchlist already use for the
// other two markets — keeps a crypto symbol from ever colliding with a
// stock ticker of the same letters, no data migration needed.
const SCANNER_PRICE_ALERTS_KEY = 'tc-scanner-price-alerts';
export function getScannerPriceAlerts(){ return lsGet(SCANNER_PRICE_ALERTS_KEY, []); }
export function getScannerPriceAlert(key){ return getScannerPriceAlerts().find(a => a.ticker === key) || null; }
// Dispatched after every mutation so whichever market's card list is
// currently hidden (not the active tab) still refreshes its own 🔔 badge
// state next time it's shown — scanner.js can't import crypto-scanner.js/
// futures-scanner.js's render functions directly without a circular
// import (they already import from this file), so a DOM event is the
// simplest way for this base module to reach both without one.
function notifyScannerPriceAlertsChanged(){
  renderScannerPriceAlertsManager();
  document.dispatchEvent(new CustomEvent('sc-price-alerts-changed'));
}
export function setScannerPriceAlert(key, direction, target){
  const alerts = getScannerPriceAlerts().filter(a => a.ticker !== key);
  if(direction && target != null && !Number.isNaN(target)) alerts.push({ ticker: key, direction, target });
  lsSet(SCANNER_PRICE_ALERTS_KEY, alerts);
  notifyScannerPriceAlertsChanged();
}
export function removeScannerPriceAlert(key){
  lsSet(SCANNER_PRICE_ALERTS_KEY, getScannerPriceAlerts().filter(a => a.ticker !== key));
  notifyScannerPriceAlertsChanged();
}
// A cross-market "alert manager" panel (thinkorswim/TC2000 both have one) —
// without this, the only way to see what's armed is opening every card on
// every tab looking for a 🔔 badge. Lives above the market tabs (not inside
// any one sc-market-* panel) since it's deliberately not scoped to whichever
// tab happens to be open; a "Jump" link switches tabs for you.
function scannerPriceAlertMarketLabel(key){
  if(key.startsWith('crypto:')) return { market: 'crypto', label: 'Crypto', symbol: key.slice(7) };
  if(key.startsWith('futures:')) return { market: 'futures', label: 'Futures', symbol: key.slice(8).replace('=F','') };
  return { market: 'stocks', label: 'Stocks', symbol: key };
}
export function renderScannerPriceAlertsManager(){
  const card = document.getElementById('sc-price-alerts-manager-card');
  const list = document.getElementById('sc-price-alerts-manager-list');
  if(!card || !list) return;
  const alerts = getScannerPriceAlerts();
  card.hidden = alerts.length === 0;
  if(alerts.length === 0) return;
  list.innerHTML = alerts.map(a => {
    const { market, label, symbol } = scannerPriceAlertMarketLabel(a.ticker);
    return `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--line);">
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
        <span class="pill neutral">${label}</span>
        <span class="mono" style="font-weight:700;">${escapeHtml(symbol)}</span>
        <span style="color:var(--muted);font-size:.85rem;">${a.direction} $${a.target}</span>
      </div>
      <div style="display:flex;gap:8px;">
        <button type="button" class="btn sc-alert-mgr-jump" data-market="${market}" style="padding:4px 10px;font-size:11px;">Jump</button>
        <button type="button" class="btn sc-alert-mgr-remove" data-key="${escapeHtml(a.ticker)}" style="padding:4px 10px;font-size:11px;">Remove</button>
      </div>
    </div>`;
  }).join('');
}
document.getElementById('sc-price-alerts-manager-list')?.addEventListener('click', (e) => {
  const jumpBtn = e.target.closest('.sc-alert-mgr-jump');
  if(jumpBtn){ document.querySelector(`#sc-market-tabs .seg-btn[data-value="${jumpBtn.dataset.market}"]`)?.click(); return; }
  const removeBtn = e.target.closest('.sc-alert-mgr-remove');
  if(removeBtn) removeScannerPriceAlert(removeBtn.dataset.key);
});
// Keeps the Stocks tab's own 🔔 badges in sync when an alert is removed via
// the cross-market manager panel above rather than that card's own Clear
// button (see notifyScannerPriceAlertsChanged for why this is an event
// instead of a direct call).
document.addEventListener('sc-price-alerts-changed', () => renderScannerTables());
// Checked against whatever raw rows the latest fetch returned (gainers +
// most active) — a target on a key that isn't in either list this cycle
// simply isn't checked yet, same "only what's currently visible" scope the
// per-ticker notes/watchlist already accept. `keyFn`/`priceFn` let Crypto/
// Futures reuse this against their own row shapes (coin.symbol vs.
// row.ticker) and prefixed alert keys, rather than duplicating this loop.
export function checkScannerPriceAlerts(allRawRows, keyFn = (r) => r.ticker, priceFn = (r) => r.price){
  if(!scannerAlertsActive()) return; // don't silently consume a one-shot target while notifications are off
  const alerts = getScannerPriceAlerts();
  if(alerts.length === 0) return;
  allRawRows.forEach(row => {
    const price = priceFn(row);
    if(price == null) return;
    const key = keyFn(row);
    const alert = alerts.find(a => a.ticker === key);
    if(!alert) return;
    const crossed = alert.direction === 'above' ? price >= alert.target : price <= alert.target;
    if(!crossed) return;
    removeScannerPriceAlert(key);
    const label = key.includes(':') ? key.split(':')[1] : key;
    const fmt = (n) => n < 1 ? n.toPrecision(4) : n.toFixed(2); // sub-$1 crypto needs more precision than 2dp
    fireScannerAlert(
      `${label} — price alert`,
      `${label} hit $${fmt(price)} (target: ${alert.direction} $${fmt(alert.target)})`
    );
  });
}
// Shared markup + click handling for the price-alert mini-form, used
// identically by Stocks (this file), Crypto, and Futures — extracted after
// the third near-verbatim copy (same "shipped on one tab, then closed the
// gap on the other two" pattern as sort/filter/heatmap/watchlist earlier
// this session) rather than letting a 4th market re-copy it again.
// `alertKey` is the ticker for Stocks, "crypto:SYMBOL"/"futures:SYMBOL" for
// the other two — see checkScannerPriceAlerts above for why.
export function scannerPriceAlertBellHtml(priceAlert){
  return priceAlert ? `<span title="Price alert: ${priceAlert.direction} $${priceAlert.target}">&#128276;</span>` : '';
}
export function scannerPriceAlertFormHtml(alertKey, placeholderPrice, priceAlert){
  return `<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
    <select class="sc-price-alert-dir" data-alert-key="${alertKey}" style="width:auto;">
      <option value="above"${priceAlert?.direction==='above'?' selected':''}>Above</option>
      <option value="below"${priceAlert?.direction==='below'?' selected':''}>Below</option>
    </select>
    <input type="number" step="any" class="sc-price-alert-target" data-alert-key="${alertKey}" value="${priceAlert?priceAlert.target:''}" placeholder="e.g. ${placeholderPrice}" style="width:100px;">
    <button type="button" class="btn sc-price-alert-set" data-alert-key="${alertKey}" style="padding:5px 10px;font-size:11px;">${priceAlert?'Update':'Set'}</button>
    ${priceAlert ? `<button type="button" class="btn sc-price-alert-clear" data-alert-key="${alertKey}" style="padding:5px 10px;font-size:11px;">Clear</button>` : ''}
  </div>`;
}
// Call at the top of each market's delegated click listener; returns true
// if the click was a price-alert Set/Clear (caller should stop handling
// that event further), false otherwise. `statusFn` reports the "enter a
// target first" validation message on that market's own status line.
export function handleScannerPriceAlertClick(e, statusFn, rerenderFn){
  const setBtn = e.target.closest('.sc-price-alert-set');
  if(setBtn){
    const scope = setBtn.closest('.sc-card-detail');
    const dir = scope.querySelector('.sc-price-alert-dir').value;
    const target = parseFloat(scope.querySelector('.sc-price-alert-target').value);
    if(Number.isNaN(target)){ statusFn('Enter a target price first.'); return true; }
    setScannerPriceAlert(setBtn.dataset.alertKey, dir, target);
    rerenderFn();
    return true;
  }
  const clearBtn = e.target.closest('.sc-price-alert-clear');
  if(clearBtn){ removeScannerPriceAlert(clearBtn.dataset.alertKey); rerenderFn(); return true; }
  return false;
}
initSegmented('sc-watch-filter');
document.getElementById('sc-watch-filter').addEventListener('click', () => renderScannerTables());

// ---------- Scanner: heatmap view for Top Gainers (TC2000's signature view) ----------
// Tile size communicates |% change| magnitude at a glance (bigger mover =
// bigger tile), color communicates direction — the classic market-heatmap
// pattern. Deliberately Top Gainers only for now (Most Active's ranking by
// raw volume doesn't map as usefully to a color/size heatmap).
initSegmented('sc-gainers-view');
document.getElementById('sc-gainers-view').addEventListener('click', () => renderScannerTables());
function scannerHeatmapTileHtml(d){
  const absPct = Math.abs(d.pct);
  const intensity = Math.min(absPct / 50, 1); // clamp at 50% move = full intensity
  const bg = d.pct >= 0
    ? `color-mix(in srgb, var(--good) ${15 + intensity*55}%, var(--surface))`
    : `color-mix(in srgb, var(--bad) ${15 + intensity*55}%, var(--surface))`;
  const flex = 1 + intensity * 3; // bigger mover = proportionally bigger tile
  return `<div class="sc-heatmap-tile" data-ticker="${d.ticker}" style="background:${bg};flex-grow:${flex};" title="${d.ticker}: ${d.pct>=0?'+':''}${d.pct.toFixed(2)}% at $${d.price.toFixed(2)} — click to expand">
    <span class="sc-heatmap-ticker">${d.ticker}</span>
    <span class="sc-heatmap-pct">${d.pct>=0?'+':''}${d.pct.toFixed(1)}%</span>
  </div>`;
}
document.getElementById('scan-gainers-heatmap').addEventListener('click', (e) => {
  const tile = e.target.closest('.sc-heatmap-tile');
  if(!tile) return;
  scannerExpandedTickers.add(tile.dataset.ticker);
  document.getElementById('sc-gainers-view').querySelector('[data-value="cards"]').click(); // switch back to Cards so the expanded detail is visible
});

// ---------- Scanner: sortable columns (in-memory only, resets on refresh) ----------
// Default sort: Change % descending, so the leading gainer of the day is row one.
// Three-click cycle per column: 1st click = ascending, 2nd = descending,
// 3rd = back to the default (Change % descending) — so sorting is always
// escapable without needing to remember which column was "original."
const DEFAULT_SORT = { key: 'pct', dir: -1 };
const scannerSortState = { gainers: {...DEFAULT_SORT, stage:0}, active: {...DEFAULT_SORT, stage:0} };
document.querySelectorAll('.sc-sort-row').forEach(headRow => {
  headRow.addEventListener('click', (e) => {
    const el = e.target.closest('[data-sort]');
    if(!el) return;
    const scope = headRow.dataset.scope;
    const state = scannerSortState[scope];
    if(state.key === el.dataset.sort){
      state.stage = (state.stage + 1) % 3;
      if(state.stage === 0){ state.key = DEFAULT_SORT.key; state.dir = DEFAULT_SORT.dir; }
      else { state.dir = state.stage === 1 ? 1 : -1; }
    } else {
      state.key = el.dataset.sort; state.dir = 1; state.stage = 1;
    }
    renderScannerTables();
  });
});
function scannerUpdateSortIndicators(){
  document.querySelectorAll('.sc-sort-row').forEach(headRow => {
    const state = scannerSortState[headRow.dataset.scope];
    headRow.querySelectorAll('[data-sort]').forEach(el => {
      const ind = el.querySelector('.sc-sort-ind');
      const isActive = state.stage !== 0 && state.key === el.dataset.sort;
      // The ▲/▼ glyph alone is a visual-only cue — a passive DOM text
      // change elsewhere on the page isn't reliably announced to screen
      // readers. aria-pressed on each sort button gives that same "is this
      // the active sort, and which direction" state a real accessible name.
      // Base label must be captured BEFORE ind.textContent is set below —
      // otherwise the first capture on an already-active button would bake
      // the arrow glyph permanently into the cached label.
      if(el.tagName === 'BUTTON'){
        const base = (el.dataset.baseLabel ??= el.textContent.trim());
        el.setAttribute('aria-pressed', String(isActive));
        el.setAttribute('aria-label', isActive ? `${base}, sorted ${state.dir === 1 ? 'ascending' : 'descending'}` : `Sort by ${base}`);
      }
      if(ind) ind.textContent = isActive ? (state.dir === 1 ? ' ▲' : ' ▼') : '';
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
        case 'news': return d.newsHours != null ? d.newsHours : Infinity; // ascending click = freshest (lowest hours) first, unchecked sorts last
        case 'momentum5m': return d.row.momentum5m != null ? d.row.momentum5m : -Infinity;
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
  const pillarBreakdown = scannerPillarBreakdown(price, pct, vol, newsOk, floatM, relVol, newsEntry);
  const setupGrade = scannerSetupGrade(pillarCount, relVol, newsEntry, catalystType);
  // Float rotation = today's volume / float. A stock trading multiples of
  // its own float (rotation well above 1x) is the classic sign of a real
  // supply/demand imbalance.
  const floatRotation = (floatM != null && floatM > 0) ? (vol / (floatM * 1e6)) : null;
  const newsHours = newsEntry && newsEntry.hoursOld != null ? newsEntry.hoursOld : null;
  return { row, ticker, price, pct, vol, manual, newsEntry, newsOk, catalystType, floatM, avgVolM, relVol, floatRotation, pillarCount, pillarBreakdown, setupGrade, newsHours, shortFloatPct: row.shortFloatPct, shortRatio: row.shortRatio, watched: isScannerWatched(ticker) };
}

const CATALYST_OPTIONS_HTML = '<option value="">None yet</option>' +
  Object.entries(CATALYST_TYPES).map(([val, info]) => `<option value="${val}">${info.good ? '' : '⚠ '}${info.label}</option>`).join('');

// Which tickers currently have their detail row expanded — module-level so
// it survives the 60s auto-refresh re-render (a trader mid-review of a
// ticker shouldn't have the panel yanked shut from under them).
const scannerExpandedTickers = new Set();

// Two-row-per-ticker layout: a dense, scannable summary row (the numbers a
// trader glances across many tickers) plus a collapsed detail row (the
// "why" — pillar breakdown, news history, manual overrides, catalyst) that
// opens on click. Keeps the default view uncluttered while keeping every
// control reachable and clearly labeled once expanded.
// Finviz's Earnings Date column comes back in a few observed shapes
// ("7/15/2026", "09/02/2026", "8/12/2026 8:30:00 AM") — all parse fine via
// the JS Date constructor's US-format leniency, but wrapped defensively
// since that constructor is notoriously inconsistent across non-US
// locales/engines for anything less standard than this. Only flags a
// *near* date (within 5 days either way) as a real caution — trading
// through an earnings print is exactly the kind of extra-volatility risk
// Warrior Trading's own material warns about, but a date months out isn't
// actionable information worth cluttering every card with.
function scannerEarningsFlag(earningsDate){
  if(!earningsDate) return null;
  const d = new Date(earningsDate);
  if(isNaN(d.getTime())) return null;
  const daysUntil = Math.round((d.setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / 86400000);
  if(Math.abs(daysUntil) > 5) return null;
  if(daysUntil === 0) return { label: 'today' };
  if(daysUntil > 0) return { label: `in ${daysUntil} day${daysUntil===1?'':'s'}` };
  return { label: `${Math.abs(daysUntil)} day${Math.abs(daysUntil)===1?'':'s'} ago` };
}

function scannerRowHtml(data, rank){
  const { ticker, price, pct, vol, manual, newsEntry, catalystType, floatM, avgVolM, relVol, floatRotation, pillarCount, pillarBreakdown, setupGrade, shortFloatPct, shortRatio, watched, row } = data;
  const sectorPerf = scannerSectorPerf(row.sector);
  const earningsFlag = scannerEarningsFlag(row.earningsDate);
  const expanded = scannerExpandedTickers.has(ticker);
  const shortTitle = shortRatio != null ? `Short ratio (days to cover): ${shortRatio.toFixed(2)}` : '';
  const freshnessIconHtml = newsEntry && newsEntry.hoursOld != null
    ? `<span title="${(newsEntry.headline||'').replace(/"/g,'&quot;')}">${scannerFreshnessBucket(newsEntry.hoursOld).icon}</span>`
    : '';
  // Surface the actual catalyst text on the card itself (not just a hover
  // tooltip) — this is the answer to "what caused this to move."
  const headlineSnippetHtml = newsEntry && newsEntry.headline
    ? `<div class="sc-card-headline" title="${escapeHtml(newsEntry.headline)}">${escapeHtml(newsEntry.headline.length > 70 ? newsEntry.headline.slice(0,68)+'…' : newsEntry.headline)}</div>`
    : '';
  const catalystBadge = scannerCatalystBadgeHtml(catalystType);
  const pillarBreakdownHtml = pillarBreakdown.map(p =>
    `<li style="display:flex;justify-content:space-between;gap:10px;padding:5px 0;font-size:12px;">
      <span>${p.ok ? '&#9989;' : '&#10060;'} ${p.label}</span>
      <span style="color:var(--muted);white-space:nowrap;">${escapeHtml(p.detail)}</span>
    </li>`).join('');
  const rankBadge = rank === 1 ? '&#127942;' : (rank <= 3 ? '&#129352;' : '');
  const cardTint = rank <= 3 ? 'background:var(--good-soft);' : (rank <= 10 ? 'background:var(--accent-soft);' : '');
  const priceAlert = getScannerPriceAlert(ticker);

  return `<div class="sc-stock-card" data-ticker="${ticker}" style="${cardTint}">
    <div class="sc-card-clickzone" role="button" tabindex="0" aria-expanded="${expanded}" aria-label="${expanded ? 'Collapse' : 'Expand'} ${ticker} details">
      <div class="sc-card-top">
        <span class="sc-card-rank mono">${rankBadge} #${rank}</span>
        <div class="sc-card-top-right">
          <span class="sc-card-expand-hint">${expanded ? '&#9660; hide' : '&#9654; details'}</span>
          <button type="button" class="sc-watch-toggle" data-ticker="${ticker}" title="${watched?'Remove from':'Add to'} watchlist" aria-label="${watched?'Remove '+ticker+' from':'Add '+ticker+' to'} watchlist" aria-pressed="${watched}">${watched ? '★' : '☆'}</button>
        </div>
      </div>
      <div class="sc-card-main">
        <div class="sc-card-ticker mono">
          <span class="sc-card-ticker-sym">${ticker}</span>${freshnessIconHtml}${watched ? '<span class="pill neutral">watching</span>' : ''}${getScannerNote(ticker) ? '<span title="You have a note on this ticker">&#128221;</span>' : ''}${scannerPriceAlertBellHtml(priceAlert)}${catalystBadge}${earningsFlag ? `<span class="pill neutral" title="Earnings ${earningsFlag.label} — extra volatility risk trading through an earnings print">&#128203; Earnings ${earningsFlag.label}</span>` : ''}
        </div>
        <div class="sc-card-change num ${pct>=0?'good':'bad'}">${pct>=0?'+':''}${pct.toFixed(2)}%</div>
      </div>
      ${headlineSnippetHtml}
      <div class="sc-card-stats">
        <div class="sc-stat"><span class="k">Price</span><span class="v num">$${price.toFixed(2)}</span></div>
        <div class="sc-stat"><span class="k">Volume</span><span class="v num">${vol.toLocaleString()}</span></div>
        <div class="sc-stat"><span class="k">Rel Vol</span><span class="v num" style="${relVol!=null && relVol>=5 ? 'color:var(--good);font-weight:700;' : ''}">${relVol!=null ? relVol.toFixed(1)+'x' : '—'}</span></div>
        <div class="sc-stat"><span class="k">Float</span><span class="v num">${floatM!=null ? floatM.toFixed(1)+'M' : '—'}</span></div>
        <div class="sc-stat"><span class="k">Pillars</span><span class="v"><span class="pill ${pillarCount===5?'good':'neutral'}">${pillarCount}/5</span></span></div>
        <div class="sc-stat"><span class="k">Setup grade</span><span class="v"><span class="pill ${setupGrade.cls}" title="Mechanical score from Pillars + rel. volume + news freshness — not investment advice.">${setupGrade.grade} &middot; ${setupGrade.label}</span></span></div>
      </div>
    </div>
    <div class="sc-card-detail" ${expanded ? '' : 'hidden'}>
      <div class="sc-detail-grid">
        <div class="sc-detail-col">
          <h4>Why ${pillarCount}/5 pillars</h4>
          <ul style="margin:0;padding:0;list-style:none;">${pillarBreakdownHtml}</ul>
          <p class="sc-detail-hint" style="margin-top:10px;">Setup grade <strong>${setupGrade.grade}</strong> (${setupGrade.label}) is a mechanical score from pillar count + how far rel. volume clears 5x + news freshness. It is <strong>not</strong> a buy/sell recommendation — no fundamentals or price target behind it.</p>
          ${row.sector ? `<p class="sc-detail-hint" style="margin-top:8px;">Sector: <strong>${escapeHtml(row.sector)}</strong>${row.industry ? ` &middot; ${escapeHtml(row.industry)}` : ''}${sectorPerf ? ` &mdash; sector is ${sectorPerf.changeToday>=0?'up':'down'} <strong style="color:${sectorPerf.changeToday>=0?'var(--good)':'var(--bad)'};">${sectorPerf.changeToday>=0?'+':''}${sectorPerf.changeToday.toFixed(2)}%</strong> today, this stock is ${Math.abs(pct - sectorPerf.changeToday) < 0.01 ? 'in line with it' : (pct > sectorPerf.changeToday ? 'outperforming it' : 'underperforming it')}` : ''}</p>` : ''}
          ${row.momentum5m != null || row.momentum15m != null ? `<p class="sc-detail-hint" style="margin-top:8px;">Intraday momentum &mdash; last 5min: <strong style="color:${(row.momentum5m||0)>=0?'var(--good)':'var(--bad)'};">${row.momentum5m!=null?(row.momentum5m>=0?'+':'')+row.momentum5m.toFixed(2)+'%':'—'}</strong> &middot; last 15min: <strong style="color:${(row.momentum15m||0)>=0?'var(--good)':'var(--bad)'};">${row.momentum15m!=null?(row.momentum15m>=0?'+':'')+row.momentum15m.toFixed(2)+'%':'—'}</strong> &mdash; ${row.momentum5m!=null && Math.sign(row.momentum5m) !== Math.sign(pct) ? 'reversing against the daily move in just the last few minutes' : 'still moving in the same direction as the daily move'}</p>` : ''}
        </div>
        <div class="sc-detail-col">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
            <h4>News (last 3)</h4>
            <button type="button" class="btn sc-check-news" data-ticker="${ticker}" style="padding:3px 8px;font-size:10px;">Check news now</button>
          </div>
          ${scannerNewsPanelHtml(ticker, newsEntry)}
        </div>
        <div class="sc-detail-col">
          <h4>Manual data &amp; catalyst</h4>
          <p class="sc-detail-hint">Override Finviz's automatic float/avg-volume for this ticker, or tag a catalyst manually if the news check missed it.</p>
          <label class="sc-detail-field">Catalyst / news type
            <select class="sc-catalyst-select" data-ticker="${ticker}">
              ${CATALYST_OPTIONS_HTML.replace(`value="${catalystType}"`, `value="${catalystType}" selected`)}
            </select>
          </label>
          <label class="sc-detail-field">Avg. daily volume (M shares)
            <input type="number" step="any" class="sc-avgvol-input" data-ticker="${ticker}" value="${avgVolM!=null?avgVolM:''}" placeholder="e.g. 1.5">
          </label>
          <label class="sc-detail-field">Float override (M shares)
            <input type="number" step="any" class="sc-float-input" data-ticker="${ticker}" value="${floatM!=null?floatM:''}" placeholder="e.g. 8">
          </label>
          <div class="sc-detail-stats">
            <span>Float rotation: <strong>${floatRotation!=null ? floatRotation.toFixed(1)+'x' : '—'}</strong></span>
            <span title="${shortTitle}">Short float: <strong>${shortFloatPct!=null ? shortFloatPct.toFixed(1)+'%' : '—'}</strong></span>
          </div>
        </div>
        <div class="sc-detail-col">
          <h4>Price alert</h4>
          <p class="sc-detail-hint">Fires a browser notification once ${ticker} crosses this price (requires alerts enabled above; checked on the next refresh this ticker still appears in Gainers/Most Active).</p>
          ${scannerPriceAlertFormHtml(ticker, price.toFixed(2), priceAlert)}
          <h4 style="margin-top:16px;">Your notes</h4>
          <textarea class="sc-note-textarea" data-ticker="${ticker}" placeholder="Why you're watching this, entry plan, anything to remember later&hellip;" rows="4">${escapeHtml(getScannerNote(ticker))}</textarea>
          <div style="flex:1;"></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">
            <a class="btn" href="https://finviz.com/quote.ashx?t=${encodeURIComponent(ticker)}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;padding:8px 12px;font-size:12px;text-decoration:none;">Finviz &#8599;</a>
            <a class="btn" href="https://www.tradingview.com/symbols/${encodeURIComponent(ticker)}/" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;padding:8px 12px;font-size:12px;text-decoration:none;">TradingView &#8599;</a>
          </div>
          <button class="btn primary" style="padding:8px 14px;font-size:12px;margin-top:8px;" onclick="__logScannerTrade('${ticker.replace(/'/g,"\\'")}', ${price}, ${pct})">Log this trade &rarr;</button>
        </div>
      </div>
    </div>
  </div>`;
}
// Shared by renderScannerTables and the CSV export, so "what you see is
// what you export" — same filter/watch-only toggle/sort applied both ways
// instead of the export silently pulling a different (e.g. unfiltered) set.
function scannerVisibleRows(){
  const cache = lsGet(SCANNER_CACHE_KEY, null);
  if(!cache) return { gainers: [], active: [] };
  const watchOnly = document.getElementById('sc-watch-filter').dataset.value === 'watch';
  let gainers = (cache.top_gainers||[]).filter(scannerFilterRow).map(scannerRowData);
  let active = (cache.most_actively_traded||[]).filter(scannerFilterRow).map(scannerRowData);
  if(watchOnly){ gainers = gainers.filter(d => d.watched); active = active.filter(d => d.watched); }
  return { gainers: scannerSortRows(gainers, 'gainers'), active: scannerSortRows(active, 'active') };
}
// "Today's Top Picks" — a Holly-style daily shortlist (Trade Ideas' AI scan
// ranks and surfaces its own top candidates rather than making you scroll a
// sorted list). Ranked by the same setup-grade score already computed per
// row, deliberately independent of whatever the user's Filters/watchlist-
// only toggle currently show — this is "best of everything fetched," not
// "best of what you're currently browsing."
function scannerTopPicks(n){
  const cache = lsGet(SCANNER_CACHE_KEY, null);
  if(!cache) return [];
  const seen = new Set();
  return [...(cache.top_gainers||[]), ...(cache.most_actively_traded||[])]
    .filter(r => r.price != null && r.pct != null && r.vol != null) // see scannerFilterRow for why this guard exists
    .filter(r => { if(seen.has(r.ticker)) return false; seen.add(r.ticker); return true; })
    .map(scannerRowData)
    .sort((a,b) => b.setupGrade.score - a.setupGrade.score)
    .slice(0, n);
}
function renderScannerTopPicks(){
  const container = document.getElementById('scanner-top-picks-list');
  if(!container) return;
  const picks = scannerTopPicks(parseInt(document.getElementById('scanner-top-picks-count')?.value, 10) || 3);
  if(picks.length === 0){
    container.innerHTML = '<p style="color:var(--muted);font-size:.85rem;margin:0;">No data yet — refresh the scanner.</p>';
    return;
  }
  container.innerHTML = picks.map((d,i) => `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px 0;${i<picks.length-1?'border-bottom:1px solid var(--line);':''}">
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
        <span class="mono" style="font-weight:700;font-size:15px;">${d.ticker}</span>
        <span class="pill ${d.setupGrade.cls}">${d.setupGrade.grade} &middot; ${d.setupGrade.label}</span>
        ${(() => { const ef = scannerEarningsFlag(d.row.earningsDate); return ef ? `<span class="pill neutral" title="Earnings ${ef.label} — extra volatility risk">&#128203; Earnings ${ef.label}</span>` : ''; })()}
      </div>
      <div class="num ${d.pct>=0?'good':'bad'}" style="font-weight:700;white-space:nowrap;">${d.pct>=0?'+':''}${d.pct.toFixed(2)}% @ $${d.price.toFixed(2)}</div>
    </div>
  `).join('');
}
// Raw top-10 gainers straight off the fetch, ignoring the price/%/vol
// filters below (and the watchlist-only toggle) — general market info,
// same "regardless of your filters" framing as Today's Top Picks.
function scannerUnfilteredGainers(n){
  const cache = lsGet(SCANNER_CACHE_KEY, null);
  if(!cache) return [];
  return (cache.top_gainers||[])
    .filter(r => r.price != null && r.pct != null && r.vol != null)
    .map(scannerRowData)
    .slice(0, n);
}
function renderScannerUnfilteredGainers(){
  const container = document.getElementById('scan-gainers-unfiltered');
  if(!container) return;
  const rows = scannerUnfilteredGainers(10);
  container.innerHTML = rows.map((d,i) => scannerRowHtml(d, i+1)).join('');
}
function renderScannerTables(){
  const gainersBody = document.getElementById('scan-gainers-tbody');
  const gainersHeatmap = document.getElementById('scan-gainers-heatmap');
  const activeBody = document.getElementById('scan-active-tbody');
  const gainersEmpty = document.getElementById('scan-gainers-empty');
  const activeEmpty = document.getElementById('scan-active-empty');
  const heatmapView = document.getElementById('sc-gainers-view').dataset.value === 'heatmap';
  gainersBody.hidden = heatmapView;
  gainersHeatmap.hidden = !heatmapView;
  if(!lsGet(SCANNER_CACHE_KEY, null)){ gainersBody.innerHTML=''; gainersHeatmap.innerHTML=''; activeBody.innerHTML=''; gainersEmpty.hidden=false; activeEmpty.hidden=false; scannerUpdateSortIndicators(); renderScannerTopPicks(); renderScannerUnfilteredGainers(); return; }
  const { gainers, active } = scannerVisibleRows();
  if(heatmapView) gainersHeatmap.innerHTML = gainers.map(scannerHeatmapTileHtml).join('');
  else gainersBody.innerHTML = gainers.map((d,i) => scannerRowHtml(d, i+1)).join('');
  activeBody.innerHTML = active.map((d,i) => scannerRowHtml(d, i+1)).join('');
  gainersEmpty.hidden = gainers.length > 0;
  activeEmpty.hidden = active.length > 0;
  scannerUpdateSortIndicators();
  renderScannerTopPicks();
  renderScannerUnfilteredGainers();
  renderScannerWatchlistManager(); // keeps watched-item prices fresh on every Stocks auto-refresh, regardless of active tab
}

// ---------- Scanner: CSV export (what you see is what you export) ----------
function scannerRowToCsvFields(d, list, rank){
  return [
    list, rank, d.ticker, d.price.toFixed(2), d.pct.toFixed(2), d.vol,
    d.relVol != null ? d.relVol.toFixed(1) : '', d.floatM != null ? d.floatM.toFixed(1) : '',
    d.pillarCount, d.setupGrade.grade, d.newsEntry?.headline || '',
    d.row.sector || '', d.row.earningsDate || '',
    d.row.momentum5m != null ? d.row.momentum5m.toFixed(2) : '',
    d.row.momentum15m != null ? d.row.momentum15m.toFixed(2) : '',
  ];
}
// Shared by all three scanner tabs' auto-refresh loops. A plain
// setInterval keeps firing every 60s even when the tab is backgrounded/
// inactive — wasted calls against Finviz Elite's paid quota, CoinGecko's
// and Yahoo's rate limits, for data nobody's looking at. Skips the interval
// tick entirely while hidden, and catches up immediately (rather than
// waiting for the next tick) the moment the tab becomes visible again if
// the data's gone stale — matches how a professional app behaves when you
// switch back to a backgrounded tab.
export function startVisibilityAwareRefresh(refreshFn, intervalMs){
  let lastRun = Date.now();
  setInterval(() => {
    if(document.visibilityState !== 'visible') return;
    lastRun = Date.now();
    refreshFn();
  }, intervalMs);
  document.addEventListener('visibilitychange', () => {
    if(document.visibilityState === 'visible' && Date.now() - lastRun >= intervalMs){
      lastRun = Date.now();
      refreshFn();
    }
  });
}

function exportScannerCsv(){
  const { gainers, active } = scannerVisibleRows();
  if(gainers.length === 0 && active.length === 0){ scannerStatus('Nothing to export yet — refresh the scanner first.'); return; }
  const header = ['List','Rank','Ticker','Price','Change%','Volume','RelVol','FloatM','Pillars','SetupGrade','Headline','Sector','EarningsDate','Momentum5m%','Momentum15m%'];
  const rows = [
    ...gainers.map((d,i) => scannerRowToCsvFields(d, 'Top Gainers', i+1)),
    ...active.map((d,i) => scannerRowToCsvFields(d, 'Most Active', i+1)),
  ];
  downloadCsv('scanner', header, rows);
}
document.getElementById('scanner-export-csv').addEventListener('click', exportScannerCsv);
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
    } else if(e.target.matches('.sc-note-textarea')){
      // 'change' (not 'input') so this only fires on blur — re-rendering
      // mid-keystroke would replace the textarea's innerHTML and steal focus.
      setScannerNote(e.target.dataset.ticker, e.target.value.trim());
      renderScannerTables();
    }
  });
  tbody.addEventListener('click', (e) => {
    const checkBtn = e.target.closest('.sc-check-news');
    if(checkBtn){ checkScannerNews(checkBtn.dataset.ticker); return; }
    const watchBtn = e.target.closest('.sc-watch-toggle');
    if(watchBtn){ toggleScannerWatch(watchBtn.dataset.ticker); renderScannerTables(); return; }
    if(handleScannerPriceAlertClick(e, scannerStatus, renderScannerTables)) return;
    // Clicking anywhere on the card's summary area (excluding the watch
    // star, already handled above, and anything inside the detail panel
    // itself) toggles that one card's expanded detail.
    const zone = e.target.closest('.sc-card-clickzone');
    if(zone){
      const ticker = zone.closest('.sc-stock-card').dataset.ticker;
      if(scannerExpandedTickers.has(ticker)) scannerExpandedTickers.delete(ticker);
      else scannerExpandedTickers.add(ticker);
      renderScannerTables();
    }
  });
  // The clickzone is a <div role="button"> (not a real <button>), so it
  // needs its own Enter/Space handling — browsers only give real buttons
  // and links free keyboard-activation. Without this, the click-to-expand
  // detail panel (which holds the Pillars breakdown, news, notes) would be
  // completely unreachable via keyboard.
  tbody.addEventListener('keydown', (e) => {
    if(e.key !== 'Enter' && e.key !== ' ') return;
    const zone = e.target.closest('.sc-card-clickzone');
    if(!zone) return;
    e.preventDefault();
    const ticker = zone.closest('.sc-stock-card').dataset.ticker;
    if(scannerExpandedTickers.has(ticker)) scannerExpandedTickers.delete(ticker);
    else scannerExpandedTickers.add(ticker);
    renderScannerTables();
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
renderScannerPriceAlertsManager(); // picks up any alerts left armed from a previous session
renderScannerWatchlistManager(); // picks up any stars left set from a previous session
