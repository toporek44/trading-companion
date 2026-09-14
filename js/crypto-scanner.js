// Crypto tab — fills the "US market is closed" gap, since crypto trades
// 24/7. Deliberately no Pillars score (that system is built around small-
// cap US stock mechanics — float, short interest, SEC filings — none of
// which apply to crypto); instead a transparent "momentum" tag based on
// volume/market-cap turnover. Card layout mirrors the stock scanner
// (summary + click-to-expand detail) for a consistent feel, and reuses its
// news-panel renderer so "last 3 articles" looks and behaves the same way.
import { lsGet, lsSet, persistProgress, SUPABASE_URL, SUPABASE_ANON_KEY } from './state.js';
import { initSegmented } from './journal.js';
import { scannerFreshnessBucket, escapeHtml, scannerNewsPanelHtml, downloadCsv, startVisibilityAwareRefresh, getScannerNote, setScannerNote, isScannerWatched, toggleScannerWatch, getScannerPriceAlert, setScannerPriceAlert, removeScannerPriceAlert, checkScannerPriceAlerts } from './scanner.js';
import { showPage } from './nav.js';
import { startFuturesIfNeeded } from './futures-scanner.js';

const CRYPTO_AUTO_REFRESH_MS = 60000;
const CRYPTO_AUTO_NEWS_CHECK_COUNT = 8; // mirrors the stock scanner's cap — keeps auto-checks bounded
const CRYPTO_CACHE_KEY = 'tc-crypto-cache';
const CRYPTO_NEWS_CACHE_KEY = 'tc-crypto-news-cache';
const cryptoExpanded = new Set();

function cryptoStatus(msg){
  const el = document.getElementById('crypto-status');
  if(el) el.textContent = msg;
}
function cryptoTodayStr(){ return new Date().toISOString().slice(0,10); }
// Prefixed key so a crypto symbol never collides with a stock ticker in the
// shared 'tc-scanner-notes' object (e.g. a hypothetical stock ticker "BTC").
function getCryptoNote(symbol){ return getScannerNote(`crypto:${symbol}`); }
function setCryptoNote(symbol, text){ setScannerNote(`crypto:${symbol}`, text); }
// Same market-prefix reasoning as the notes functions above — a crypto
// symbol must never collide with a stock ticker in the shared watchlist.
function isCryptoWatched(symbol){ return isScannerWatched(`crypto:${symbol}`); }
function toggleCryptoWatch(symbol){ toggleScannerWatch(`crypto:${symbol}`); }
// Same market-prefix reasoning, same one-shot price-target feature the
// Stocks tab already has — see js/scanner.js's checkScannerPriceAlerts.
function getCryptoPriceAlert(symbol){ return getScannerPriceAlert(`crypto:${symbol}`); }
function cryptoSlug(name){ return String(name || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }

function getCryptoNewsCache(){ return lsGet(CRYPTO_NEWS_CACHE_KEY, {}); }
function setCryptoNewsEntry(symbol, entry){
  const cache = getCryptoNewsCache();
  cache[`${symbol}|${cryptoTodayStr()}`] = entry;
  lsSet(CRYPTO_NEWS_CACHE_KEY, cache);
}
function getCryptoNewsToday(symbol){
  return getCryptoNewsCache()[`${symbol}|${cryptoTodayStr()}`] || null;
}

async function checkCryptoNews(coin, {silent} = {}){
  if(!silent) cryptoStatus(`Checking news for ${coin.symbol}…`);
  try{
    const res = await fetch(`/api/scanner-crypto-news?slug=${encodeURIComponent(cryptoSlug(coin.name))}`);
    const data = await res.json();
    if(data.error){ if(!silent) cryptoStatus(`${data.error} News check for ${coin.symbol} not completed.`); return; }
    const items = data.items || [];
    setCryptoNewsEntry(coin.symbol, { checkedAt: Date.now(), items, headline: items[0]?.headline ?? null, hoursOld: items[0]?.hoursOld ?? null });
    if(!silent){ cryptoStatus(`${coin.symbol}: ${items.length ? `${items.length} article(s) found.` : 'no recent articles found.'}`); renderCryptoLists(); }
  }catch(err){
    if(!silent) cryptoStatus(`Could not reach the news endpoint for ${coin.symbol}.`);
  }
}
async function autoCheckTopCryptoNews(coins){
  let any = false;
  for(const coin of coins.slice(0, CRYPTO_AUTO_NEWS_CHECK_COUNT)){
    if(getCryptoNewsToday(coin.symbol)) continue;
    await checkCryptoNews(coin, {silent: true});
    any = true;
  }
  if(any) renderCryptoLists();
}

// Transparent, non-advisory read of whether a move is backed by real
// turnover (volume relative to market cap) or looks thin/illiquid.
function cryptoMomentum(coin){
  const turnover = coin.marketCap > 0 ? coin.volume / coin.marketCap : null;
  const pct = coin.pct;
  if(pct == null || turnover == null) return { label: 'Insufficient data', cls: 'neutral', turnover: null };
  if(Math.abs(pct) >= 8 && turnover >= 0.15) return { label: 'High momentum, liquid', cls: 'good', turnover };
  if(Math.abs(pct) >= 8 && turnover < 0.05) return { label: 'Big move, thin volume', cls: 'bad', turnover };
  if(Math.abs(pct) >= 3) return { label: 'Moderate move', cls: 'neutral', turnover };
  return { label: 'Quiet', cls: 'neutral', turnover };
}

function cryptoCardHtml(coin, rank){
  const expanded = cryptoExpanded.has(coin.symbol);
  const watched = isCryptoWatched(coin.symbol);
  const priceAlert = getCryptoPriceAlert(coin.symbol);
  const pct = coin.pct;
  const pctHtml = pct != null
    ? `<span class="sc-card-change num ${pct>=0?'good':'bad'}">${pct>=0?'+':''}${pct.toFixed(2)}%</span>`
    : `<span class="sc-card-change num">&mdash;</span>`;
  const momentum = cryptoMomentum(coin);
  const newsEntry = getCryptoNewsToday(coin.symbol);
  const freshnessIconHtml = newsEntry && newsEntry.hoursOld != null
    ? `<span title="${escapeHtml(newsEntry.headline||'')}">${scannerFreshnessBucket(newsEntry.hoursOld).icon}</span>` : '';
  const headlineHtml = newsEntry && newsEntry.headline
    ? `<div class="sc-card-headline" title="${escapeHtml(newsEntry.headline)}">${escapeHtml(newsEntry.headline.length>70?newsEntry.headline.slice(0,68)+'…':newsEntry.headline)}</div>` : '';

  return `<div class="sc-stock-card" data-symbol="${coin.symbol}">
    <div class="sc-card-clickzone" role="button" tabindex="0" aria-expanded="${expanded}" aria-label="${expanded ? 'Collapse' : 'Expand'} ${coin.symbol} details">
      <div class="sc-card-top">
        <span class="sc-card-rank mono">#${rank}</span>
        <div class="sc-card-top-right">
          <span class="sc-card-expand-hint">${expanded ? '&#9660; hide' : '&#9654; details'}</span>
          <button type="button" class="sc-watch-toggle" data-symbol="${coin.symbol}" title="${watched?'Remove from':'Add to'} watchlist" aria-label="${watched?'Remove '+coin.symbol+' from':'Add '+coin.symbol+' to'} watchlist" aria-pressed="${watched}">${watched ? '★' : '☆'}</button>
        </div>
      </div>
      <div class="sc-card-main">
        <div class="sc-card-ticker mono">
          <span class="sc-card-ticker-sym">${coin.symbol}</span>${freshnessIconHtml}${watched ? '<span class="pill neutral">watching</span>' : ''}${getCryptoNote(coin.symbol) ? '<span title="You have a note on this coin">&#128221;</span>' : ''}${priceAlert ? `<span title="Price alert: ${priceAlert.direction} $${priceAlert.target}">&#128276;</span>` : ''}
          <span style="color:var(--muted);font-weight:400;font-size:12px;">${escapeHtml(coin.name||'')}</span>
        </div>
        ${pctHtml}
      </div>
      ${headlineHtml}
      <div class="sc-card-stats">
        <div class="sc-stat"><span class="k">Price</span><span class="v num">$${coin.price < 1 ? coin.price.toPrecision(4) : coin.price.toLocaleString(undefined,{maximumFractionDigits:2})}</span></div>
        <div class="sc-stat"><span class="k">24h Volume</span><span class="v num">${coin.volume!=null ? '$'+Math.round(coin.volume).toLocaleString() : '—'}</span></div>
        <div class="sc-stat"><span class="k">Market Cap</span><span class="v num">${coin.marketCap!=null ? '$'+Math.round(coin.marketCap).toLocaleString() : '—'}</span></div>
        <div class="sc-stat"><span class="k">Momentum</span><span class="v"><span class="pill ${momentum.cls}">${momentum.label}</span></span></div>
      </div>
    </div>
    <div class="sc-card-detail" ${expanded ? '' : 'hidden'}>
      <div class="sc-detail-grid">
        <div class="sc-detail-col">
          <h4>Why this is moving</h4>
          <ul style="margin:0;padding:0;list-style:none;">
            <li style="display:flex;justify-content:space-between;gap:10px;padding:5px 0;font-size:12px;"><span>24h change</span><span style="color:var(--muted);">${pct!=null?(pct>=0?'+':'')+pct.toFixed(2)+'%':'—'}</span></li>
            <li style="display:flex;justify-content:space-between;gap:10px;padding:5px 0;font-size:12px;"><span>Volume / market-cap turnover</span><span style="color:var(--muted);">${momentum.turnover!=null?(momentum.turnover*100).toFixed(1)+'%':'—'}</span></li>
            <li style="display:flex;justify-content:space-between;gap:10px;padding:5px 0;font-size:12px;"><span>Read</span><span style="color:var(--muted);">${momentum.label}</span></li>
          </ul>
          <p class="sc-detail-hint" style="margin-top:10px;">Turnover = 24h volume &divide; market cap. High turnover means the move has real trading behind it; low turnover on a big % move means it's easy to get stuck &mdash; thin order books swing hard on small trades. <strong>Not a buy/sell signal.</strong></p>
        </div>
        <div class="sc-detail-col">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
            <h4>News (last 3)</h4>
            <button type="button" class="btn crypto-check-news" data-symbol="${coin.symbol}" style="padding:3px 8px;font-size:10px;">Check news now</button>
          </div>
          ${scannerNewsPanelHtml(coin.symbol, newsEntry)}
          <p class="sc-detail-hint" style="margin-top:8px;">Sourced from Cointelegraph's per-coin feed &mdash; coverage depends on how actively that outlet tags this coin, so a "no articles found" doesn't necessarily mean nothing happened.</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">
            <a class="btn" href="https://www.coingecko.com/en/coins/${cryptoSlug(coin.name)}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;padding:8px 12px;font-size:12px;text-decoration:none;">CoinGecko &#8599;</a>
            <a class="btn" href="https://www.tradingview.com/symbols/${encodeURIComponent(coin.symbol)}USD/" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;padding:8px 12px;font-size:12px;text-decoration:none;">TradingView &#8599;</a>
          </div>
        </div>
        <div class="sc-detail-col">
          <h4>Price alert</h4>
          <p class="sc-detail-hint">Fires a browser notification once ${coin.symbol} crosses this price (requires alerts enabled on the Stocks tab; checked on the next refresh this coin still appears in Top Movers).</p>
          <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
            <select class="sc-price-alert-dir" data-symbol="${coin.symbol}" style="width:auto;">
              <option value="above"${priceAlert?.direction==='above'?' selected':''}>Above</option>
              <option value="below"${priceAlert?.direction==='below'?' selected':''}>Below</option>
            </select>
            <input type="number" step="any" class="sc-price-alert-target" data-symbol="${coin.symbol}" value="${priceAlert?priceAlert.target:''}" placeholder="e.g. ${coin.price < 1 ? coin.price.toPrecision(4) : coin.price.toFixed(2)}" style="width:100px;">
            <button type="button" class="btn sc-price-alert-set" data-symbol="${coin.symbol}" style="padding:5px 10px;font-size:11px;">${priceAlert?'Update':'Set'}</button>
            ${priceAlert ? `<button type="button" class="btn sc-price-alert-clear" data-symbol="${coin.symbol}" style="padding:5px 10px;font-size:11px;">Clear</button>` : ''}
          </div>
          <h4 style="margin-top:16px;">Your notes</h4>
          <textarea class="sc-note-textarea" data-symbol="${coin.symbol}" placeholder="Why you're watching this, entry plan, anything to remember later&hellip;" rows="4">${escapeHtml(getCryptoNote(coin.symbol))}</textarea>
          <div style="flex:1;"></div>
          <button class="btn primary" style="padding:8px 14px;font-size:12px;margin-top:10px;" onclick="__logCryptoTrade('${coin.symbol.replace(/'/g,"\\'")}')">Log this trade &rarr;</button>
        </div>
      </div>
    </div>
  </div>`;
}

// ---------- Crypto: filters + sorting (parity with the US Stocks tab) ----------
function cryptoFilterRow(coin){
  if(coin.price == null || coin.pct == null) return false; // same defense-in-depth as scannerFilterRow — never let a null reach the card renderer's unguarded .toFixed()
  const minP = parseFloat(document.getElementById('cr-minprice').value) || 0;
  const maxPRaw = document.getElementById('cr-maxprice').value.trim();
  const maxP = maxPRaw === '' ? Infinity : (parseFloat(maxPRaw) || Infinity);
  const minPct = parseFloat(document.getElementById('cr-minpct').value) || 0;
  const minVol = parseFloat(document.getElementById('cr-minvol').value) || 0;
  const watchOnly = document.getElementById('cr-watch-filter').dataset.value === 'watch';
  if(watchOnly && !isCryptoWatched(coin.symbol)) return false;
  return coin.price >= minP && coin.price <= maxP && Math.abs(coin.pct) >= minPct && (coin.volume ?? 0) >= minVol;
}
['cr-minprice','cr-maxprice','cr-minpct','cr-minvol'].forEach(id => {
  document.getElementById(id).addEventListener('input', renderCryptoLists);
});
initSegmented('cr-watch-filter');
document.getElementById('cr-watch-filter').addEventListener('click', () => renderCryptoLists());

// Reset to defaults — parity with the Stocks tab's own reset button. Also
// clears "Watchlist only" back to "All", since that's the filter most
// likely to silently leave someone staring at an empty list wondering
// where every coin went, and clears any loaded preset name.
document.getElementById('cr-filters-reset').addEventListener('click', () => {
  document.getElementById('cr-minprice').value = '0';
  document.getElementById('cr-maxprice').value = '';
  document.getElementById('cr-minpct').value = '0';
  document.getElementById('cr-minvol').value = '0';
  const watchFilter = document.getElementById('cr-watch-filter');
  watchFilter.dataset.value = 'all';
  watchFilter.querySelectorAll('.seg-btn').forEach(b => b.classList.toggle('active', b.dataset.value === 'all'));
  const presetSelect = document.getElementById('cr-preset-select');
  if(presetSelect) presetSelect.value = '';
  renderCryptoLists();
  cryptoStatus('Filters reset to defaults.');
});

// ---------- Crypto: saved filter presets (parity with the Stocks tab) ----------
const CRYPTO_PRESETS_KEY = 'crypto-scanner-presets';
const CRYPTO_PRESET_FIELD_IDS = { min: 'cr-minprice', max: 'cr-maxprice', minpct: 'cr-minpct', minvol: 'cr-minvol' };
let cryptoPresets = [];

function renderCryptoPresetOptions(){
  const select = document.getElementById('cr-preset-select');
  const current = select.value;
  select.innerHTML = '<option value="">Load a preset&hellip;</option>' +
    cryptoPresets.map(p => `<option value="${escapeHtml(p.name)}">${escapeHtml(p.name)}</option>`).join('');
  if(cryptoPresets.some(p => p.name === current)) select.value = current;
}
async function loadCryptoPresets(){
  try{
    const res = await fetch(`${SUPABASE_URL}/rest/v1/progress?key=eq.${CRYPTO_PRESETS_KEY}&select=state`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    });
    const rows = await res.json();
    const s = Array.isArray(rows) && rows[0] && rows[0].state;
    cryptoPresets = Array.isArray(s) ? s : [];
  }catch(e){ cryptoPresets = []; }
  renderCryptoPresetOptions();
}
loadCryptoPresets();

document.getElementById('cr-preset-select').addEventListener('change', (e) => {
  const preset = cryptoPresets.find(p => p.name === e.target.value);
  if(!preset) return;
  Object.entries(CRYPTO_PRESET_FIELD_IDS).forEach(([field, id]) => {
    if(preset[field] != null) document.getElementById(id).value = preset[field];
  });
  renderCryptoLists();
  cryptoStatus(`Loaded preset "${preset.name}".`);
});
document.getElementById('cr-preset-save').addEventListener('click', () => {
  const name = (prompt('Name this preset (e.g. "Big movers only"):') || '').trim();
  if(!name) return;
  const values = {};
  Object.entries(CRYPTO_PRESET_FIELD_IDS).forEach(([field, id]) => {
    const v = parseFloat(document.getElementById(id).value);
    values[field] = isNaN(v) ? null : v;
  });
  cryptoPresets = [...cryptoPresets.filter(p => p.name !== name), { name, ...values }];
  persistProgress(CRYPTO_PRESETS_KEY, cryptoPresets);
  renderCryptoPresetOptions();
  document.getElementById('cr-preset-select').value = name;
  cryptoStatus(`Saved preset "${name}".`);
});
document.getElementById('cr-preset-delete').addEventListener('click', () => {
  const select = document.getElementById('cr-preset-select');
  const name = select.value;
  if(!name) return;
  cryptoPresets = cryptoPresets.filter(p => p.name !== name);
  persistProgress(CRYPTO_PRESETS_KEY, cryptoPresets);
  renderCryptoPresetOptions();
  cryptoStatus(`Deleted preset "${name}".`);
});

// Same 3-click cycle as the Stocks tab's sort pills: ascending, descending,
// back to each list's own natural default (gainers by |%change|, active by
// volume — matching what the API already sorts by server-side).
const CRYPTO_SORT_DEFAULTS = { 'crypto-gainers': { key: 'pct', dir: -1 }, 'crypto-active': { key: 'volume', dir: -1 } };
const cryptoSortState = {
  'crypto-gainers': { ...CRYPTO_SORT_DEFAULTS['crypto-gainers'], stage: 0 },
  'crypto-active': { ...CRYPTO_SORT_DEFAULTS['crypto-active'], stage: 0 },
};
function cryptoSortRows(coins, scope){
  const state = cryptoSortState[scope];
  return coins.slice().sort((a, b) => {
    const pick = (c) => {
      switch(state.key){
        case 'symbol': return c.symbol;
        case 'price': return c.price;
        case 'volume': return c.volume ?? -Infinity;
        case 'marketCap': return c.marketCap ?? -Infinity;
        default: return Math.abs(c.pct ?? -Infinity); // "pct" sorts by |change| — matches "Top movers" semantics (a -30% mover is as notable as +30%)
      }
    };
    const av = pick(a), bv = pick(b);
    return typeof av === 'string' ? state.dir * av.localeCompare(bv) : state.dir * (av - bv);
  });
}
document.querySelectorAll('.sc-sort-bar[data-scope^="crypto-"]').forEach(headRow => {
  headRow.addEventListener('click', (e) => {
    const el = e.target.closest('[data-sort]');
    if(!el) return;
    const scope = headRow.dataset.scope;
    const state = cryptoSortState[scope];
    if(state.key === el.dataset.sort){
      state.stage = (state.stage + 1) % 3;
      if(state.stage === 0) Object.assign(state, CRYPTO_SORT_DEFAULTS[scope]);
      else state.dir = state.stage === 1 ? 1 : -1;
    } else {
      state.key = el.dataset.sort; state.dir = 1; state.stage = 1;
    }
    renderCryptoLists();
  });
});
function updateCryptoSortIndicators(){
  document.querySelectorAll('.sc-sort-bar[data-scope^="crypto-"]').forEach(headRow => {
    const state = cryptoSortState[headRow.dataset.scope];
    headRow.querySelectorAll('[data-sort]').forEach(el => {
      const ind = el.querySelector('.sc-sort-ind');
      const isActive = state.stage !== 0 && state.key === el.dataset.sort;
      const base = (el.dataset.baseLabel ??= el.textContent.trim());
      el.setAttribute('aria-pressed', String(isActive));
      el.setAttribute('aria-label', isActive ? `${base}, sorted ${state.dir === 1 ? 'ascending' : 'descending'}` : `Sort by ${base}`);
      if(ind) ind.textContent = isActive ? (state.dir === 1 ? ' ▲' : ' ▼') : '';
    });
  });
}

function renderCryptoList(containerId, emptyId, coins){
  const container = document.getElementById(containerId);
  const empty = document.getElementById(emptyId);
  if(!coins || coins.length === 0){
    container.innerHTML = '';
    empty.hidden = false;
    return;
  }
  empty.hidden = true;
  container.innerHTML = coins.map((c,i) => cryptoCardHtml(c, i+1)).join('');
}

// TC2000-style heatmap, mirroring the Stocks tab's scannerHeatmapTileHtml —
// Top movers only, same as Stocks (Most Active's ranking by raw volume
// doesn't map as usefully to a color/size heatmap). Deliberately its own
// function rather than reusing scanner.js's version: that one keys off
// `d.ticker`/`data-ticker`, while everything else in this file (notes,
// watchlist, sort) already keys off `.symbol`/`data-symbol`.
function cryptoHeatmapTileHtml(c){
  const absPct = Math.abs(c.pct);
  const intensity = Math.min(absPct / 20, 1); // crypto moves bigger than stocks day-to-day; clamp at 20% for full intensity
  const bg = c.pct >= 0
    ? `color-mix(in srgb, var(--good) ${15 + intensity*55}%, var(--surface))`
    : `color-mix(in srgb, var(--bad) ${15 + intensity*55}%, var(--surface))`;
  const flex = 1 + intensity * 3;
  return `<div class="sc-heatmap-tile" data-symbol="${c.symbol}" style="background:${bg};flex-grow:${flex};" title="${c.symbol}: ${c.pct>=0?'+':''}${c.pct.toFixed(2)}% at $${c.price.toFixed(2)} — click to expand">
    <span class="sc-heatmap-ticker">${c.symbol}</span>
    <span class="sc-heatmap-pct">${c.pct>=0?'+':''}${c.pct.toFixed(1)}%</span>
  </div>`;
}
initSegmented('cr-gainers-view');
document.getElementById('cr-gainers-view').addEventListener('click', () => renderCryptoLists());
document.getElementById('crypto-gainers-heatmap').addEventListener('click', (e) => {
  const tile = e.target.closest('.sc-heatmap-tile');
  if(!tile) return;
  cryptoExpanded.add(tile.dataset.symbol);
  document.getElementById('cr-gainers-view').querySelector('[data-value="cards"]').click(); // switch back to Cards so the expanded detail is visible
});

function renderCryptoLists(){
  const cache = lsGet(CRYPTO_CACHE_KEY, null);
  if(!cache) return;
  const gainers = cryptoSortRows((cache.top_gainers || []).filter(cryptoFilterRow), 'crypto-gainers');
  const active = cryptoSortRows((cache.most_active || []).filter(cryptoFilterRow), 'crypto-active');
  const heatmapView = document.getElementById('cr-gainers-view').dataset.value === 'heatmap';
  document.getElementById('crypto-gainers-list').hidden = heatmapView;
  document.getElementById('crypto-gainers-heatmap').hidden = !heatmapView;
  if(heatmapView) document.getElementById('crypto-gainers-heatmap').innerHTML = gainers.map(cryptoHeatmapTileHtml).join('');
  else renderCryptoList('crypto-gainers-list', 'crypto-gainers-empty', gainers);
  if(heatmapView) document.getElementById('crypto-gainers-empty').hidden = gainers.length > 0;
  renderCryptoList('crypto-active-list', 'crypto-active-empty', active);
  updateCryptoSortIndicators();
}

['crypto-gainers-list','crypto-active-list'].forEach(id => {
  const container = document.getElementById(id);
  container.addEventListener('change', (e) => {
    if(!e.target.matches('.sc-note-textarea')) return;
    // 'change' (not 'input') so this only fires on blur — matches the
    // Stocks tab's note textarea, and avoids re-rendering mid-keystroke
    // (which would replace the textarea's innerHTML and steal focus).
    setCryptoNote(e.target.dataset.symbol, e.target.value.trim());
    renderCryptoLists();
  });
  container.addEventListener('click', (e) => {
    const checkBtn = e.target.closest('.crypto-check-news');
    if(checkBtn){
      const cache = lsGet(CRYPTO_CACHE_KEY, {top_gainers:[],most_active:[]});
      const coin = [...(cache.top_gainers||[]), ...(cache.most_active||[])].find(c => c.symbol === checkBtn.dataset.symbol);
      if(coin) checkCryptoNews(coin);
      return;
    }
    const watchBtn = e.target.closest('.sc-watch-toggle');
    if(watchBtn){ toggleCryptoWatch(watchBtn.dataset.symbol); renderCryptoLists(); return; }
    const alertSetBtn = e.target.closest('.sc-price-alert-set');
    if(alertSetBtn){
      const symbol = alertSetBtn.dataset.symbol;
      const card = alertSetBtn.closest('.sc-card-detail');
      const dir = card.querySelector('.sc-price-alert-dir').value;
      const target = parseFloat(card.querySelector('.sc-price-alert-target').value);
      if(Number.isNaN(target)){ cryptoStatus('Enter a target price first.'); return; }
      setScannerPriceAlert(`crypto:${symbol}`, dir, target);
      renderCryptoLists();
      return;
    }
    const alertClearBtn = e.target.closest('.sc-price-alert-clear');
    if(alertClearBtn){ removeScannerPriceAlert(`crypto:${alertClearBtn.dataset.symbol}`); renderCryptoLists(); return; }
    const zone = e.target.closest('.sc-card-clickzone');
    if(zone){
      const symbol = zone.closest('.sc-stock-card').dataset.symbol;
      if(cryptoExpanded.has(symbol)) cryptoExpanded.delete(symbol); else cryptoExpanded.add(symbol);
      renderCryptoLists();
    }
  });
  // See scanner.js's matching keydown handler for why this exists — the
  // clickzone is a <div role="button">, which needs manual Enter/Space
  // activation (browsers only auto-handle that for real <button>/<a>).
  container.addEventListener('keydown', (e) => {
    if(e.key !== 'Enter' && e.key !== ' ') return;
    const zone = e.target.closest('.sc-card-clickzone');
    if(!zone) return;
    e.preventDefault();
    const symbol = zone.closest('.sc-stock-card').dataset.symbol;
    if(cryptoExpanded.has(symbol)) cryptoExpanded.delete(symbol); else cryptoExpanded.add(symbol);
    renderCryptoLists();
  });
});

// See scanner.js's scannerRefreshInFlight for why this guard exists — same
// overlapping-request risk applies here.
let cryptoRefreshInFlight = false;
async function refreshCrypto(){
  if(cryptoRefreshInFlight) return;
  cryptoRefreshInFlight = true;
  cryptoStatus('Fetching live crypto market data…');
  try{
    const res = await fetch('/api/scanner-crypto');
    const data = await res.json();
    if(data.error){ cryptoStatus(`${data.error} Showing last cached data if available.`); return; }
    lsSet(CRYPTO_CACHE_KEY, { top_gainers: data.top_gainers || [], most_active: data.most_active || [] });
    renderCryptoLists();
    checkScannerPriceAlerts([...(data.top_gainers||[]), ...(data.most_active||[])], (r) => `crypto:${r.symbol}`, (r) => r.price);
    cryptoStatus(`Updated ${new Date(data.fetchedAt).toLocaleTimeString()} — auto-refreshes every ${CRYPTO_AUTO_REFRESH_MS/1000}s.`);
    // Awaited (not fire-and-forget) so cryptoRefreshInFlight — and thus the
    // overlapping-refresh guard above — stays true for the full duration of
    // this up-to-8-coin news-check sequence, not just the initial fetch.
    // Without this, clicking "Refresh now" again mid-sequence could start a
    // second concurrent pass over the same coins, wasting Cointelegraph
    // calls and racing on the same localStorage cache entries.
    await autoCheckTopCryptoNews(data.top_gainers || []);
  }catch(err){
    cryptoStatus('Could not reach the crypto endpoint. Showing last cached data if available.');
  }finally{
    cryptoRefreshInFlight = false;
  }
}
document.getElementById('crypto-refresh').addEventListener('click', refreshCrypto);

function exportCryptoCsv(){
  const cache = lsGet(CRYPTO_CACHE_KEY, null);
  if(!cache) return;
  // Exports exactly what's currently visible (filters + sort applied) —
  // same "what you see is what you export" principle as the Stocks tab.
  const gainers = cryptoSortRows((cache.top_gainers || []).filter(cryptoFilterRow), 'crypto-gainers');
  const active = cryptoSortRows((cache.most_active || []).filter(cryptoFilterRow), 'crypto-active');
  if(gainers.length === 0 && active.length === 0) return;
  const header = ['List','Rank','Symbol','Name','Price','24hChange%','24hVolume','MarketCap'];
  const toRow = (c, list, rank) => [list, rank, c.symbol, c.name, c.price, c.pct != null ? c.pct.toFixed(2) : '', c.volume, c.marketCap];
  const rows = [
    ...gainers.map((c,i) => toRow(c, 'Top Movers', i+1)),
    ...active.map((c,i) => toRow(c, 'Most Active', i+1)),
  ];
  downloadCsv('crypto-scanner', header, rows);
}
document.getElementById('crypto-export-csv').addEventListener('click', exportCryptoCsv);

// ---------- Market tabs (US Stocks / Crypto) ----------
let cryptoStarted = false;
initSegmented('sc-market-tabs');
document.getElementById('sc-market-tabs').addEventListener('click', (e) => {
  const btn = e.target.closest('.seg-btn');
  if(!btn) return;
  const market = btn.dataset.value;
  document.getElementById('sc-market-stocks').hidden = market !== 'stocks';
  document.getElementById('sc-market-crypto').hidden = market !== 'crypto';
  document.getElementById('sc-market-futures').hidden = market !== 'futures';
  if(market === 'crypto' && !cryptoStarted){
    cryptoStarted = true;
    refreshCrypto();
    startVisibilityAwareRefresh(refreshCrypto, CRYPTO_AUTO_REFRESH_MS);
  }
  if(market === 'futures') startFuturesIfNeeded();
});

// "Log this trade" existed only on the Stocks tab (js/scanner.js's own
// __logScannerTrade) — same class of Stocks-only gap already fixed this
// session for notes/watchlist/presets. Deliberately does NOT fill the
// Journal's "Stock % gain on day" pillar field even though a coin's 24h
// change is conceptually similar — that field's label and the 5-Pillars
// system behind it are stock-specific, and auto-filling it here would
// misleadingly imply crypto trades get scored against Pillars too.
window.__logCryptoTrade = function(symbol){
  showPage('journal');
  document.getElementById('f-market').value = 'Crypto';
  document.getElementById('f-instrument').value = symbol;
  document.getElementById('f-tags').value = 'from-scanner';
  document.getElementById('f-instrument').scrollIntoView({behavior:'smooth', block:'center'});
};
