// Crypto tab — fills the "US market is closed" gap, since crypto trades
// 24/7. Deliberately no Pillars score (that system is built around small-
// cap US stock mechanics — float, short interest, SEC filings — none of
// which apply to crypto); instead a transparent "momentum" tag based on
// volume/market-cap turnover. Card layout mirrors the stock scanner
// (summary + click-to-expand detail) for a consistent feel, and reuses its
// news-panel renderer so "last 3 articles" looks and behaves the same way.
import { lsGet, lsSet } from './state.js';
import { initSegmented } from './journal.js';
import { scannerFreshnessBucket, escapeHtml, scannerNewsPanelHtml, downloadCsv } from './scanner.js';
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
        <span class="sc-card-expand-hint">${expanded ? '&#9660; hide' : '&#9654; details'}</span>
      </div>
      <div class="sc-card-main">
        <div class="sc-card-ticker mono">
          <span class="sc-card-ticker-sym">${coin.symbol}</span>${freshnessIconHtml}
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
      </div>
    </div>
  </div>`;
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

function renderCryptoLists(){
  const cache = lsGet(CRYPTO_CACHE_KEY, null);
  if(!cache) return;
  renderCryptoList('crypto-gainers-list', 'crypto-gainers-empty', cache.top_gainers || []);
  renderCryptoList('crypto-active-list', 'crypto-active-empty', cache.most_active || []);
}

['crypto-gainers-list','crypto-active-list'].forEach(id => {
  const container = document.getElementById(id);
  container.addEventListener('click', (e) => {
    const checkBtn = e.target.closest('.crypto-check-news');
    if(checkBtn){
      const cache = lsGet(CRYPTO_CACHE_KEY, {top_gainers:[],most_active:[]});
      const coin = [...(cache.top_gainers||[]), ...(cache.most_active||[])].find(c => c.symbol === checkBtn.dataset.symbol);
      if(coin) checkCryptoNews(coin);
      return;
    }
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
  const gainers = cache?.top_gainers || [];
  const active = cache?.most_active || [];
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
    setInterval(refreshCrypto, CRYPTO_AUTO_REFRESH_MS);
  }
  if(market === 'futures') startFuturesIfNeeded();
});
