// Crypto tab — fills the "US market is closed" gap, since crypto trades
// 24/7. Deliberately simple: no Pillars/News/float scoring (that system is
// built around small-cap US stock mechanics — float, short interest, SEC
// news filings — none of which apply to crypto), just clean gainers/volume
// cards from CoinGecko's free public API. Reuses the Scanner's card CSS
// (.sc-card-grid / .sc-stock-card / .sc-stat) for a consistent look.
import { initSegmented } from './journal.js';

const CRYPTO_AUTO_REFRESH_MS = 60000;

function cryptoStatus(msg){
  const el = document.getElementById('crypto-status');
  if(el) el.textContent = msg;
}

function cryptoCardHtml(coin, rank){
  const pct = coin.pct;
  const pctHtml = pct != null
    ? `<span class="sc-card-change num ${pct>=0?'good':'bad'}">${pct>=0?'+':''}${pct.toFixed(2)}%</span>`
    : `<span class="sc-card-change num">&mdash;</span>`;
  return `<div class="sc-stock-card">
    <div class="sc-card-top">
      <span class="sc-card-rank mono">#${rank}</span>
    </div>
    <div class="sc-card-main">
      <div class="sc-card-ticker mono">
        <span class="sc-card-ticker-sym">${coin.symbol}</span>
        <span style="color:var(--muted);font-weight:400;font-size:12px;">${coin.name || ''}</span>
      </div>
      ${pctHtml}
    </div>
    <div class="sc-card-stats">
      <div class="sc-stat"><span class="k">Price</span><span class="v num">$${coin.price < 1 ? coin.price.toPrecision(4) : coin.price.toLocaleString(undefined,{maximumFractionDigits:2})}</span></div>
      <div class="sc-stat"><span class="k">24h Volume</span><span class="v num">$${Math.round(coin.volume).toLocaleString()}</span></div>
      <div class="sc-stat"><span class="k">Market Cap</span><span class="v num">$${Math.round(coin.marketCap).toLocaleString()}</span></div>
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

async function refreshCrypto(){
  cryptoStatus('Fetching live crypto market data…');
  try{
    const res = await fetch('/api/scanner-crypto');
    const data = await res.json();
    if(data.error){ cryptoStatus(`${data.error} Showing last cached data if available.`); return; }
    renderCryptoList('crypto-gainers-list', 'crypto-gainers-empty', data.top_gainers || []);
    renderCryptoList('crypto-active-list', 'crypto-active-empty', data.most_active || []);
    cryptoStatus(`Updated ${new Date(data.fetchedAt).toLocaleTimeString()} — auto-refreshes every ${CRYPTO_AUTO_REFRESH_MS/1000}s.`);
  }catch(err){
    cryptoStatus('Could not reach the crypto endpoint. Showing last cached data if available.');
  }
}
document.getElementById('crypto-refresh').addEventListener('click', refreshCrypto);

// ---------- Market tabs (US Stocks / Crypto) ----------
let cryptoStarted = false;
initSegmented('sc-market-tabs');
document.getElementById('sc-market-tabs').addEventListener('click', (e) => {
  const btn = e.target.closest('.seg-btn');
  if(!btn) return;
  const market = btn.dataset.value;
  document.getElementById('sc-market-stocks').hidden = market !== 'stocks';
  document.getElementById('sc-market-crypto').hidden = market !== 'crypto';
  if(market === 'crypto' && !cryptoStarted){
    cryptoStarted = true;
    refreshCrypto();
    setInterval(refreshCrypto, CRYPTO_AUTO_REFRESH_MS);
  }
});
