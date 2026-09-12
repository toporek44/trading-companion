// Keyboard shortcuts for the Scanner page — a staple of every "professional"
// screener (TC2000, Thinkorswim, Trade Ideas all have them) that a mouse-
// only tool doesn't. Deliberately implemented as thin wrappers that click
// the scanner/crypto/futures modules' own existing buttons rather than
// duplicating their logic — this file never touches scanner state directly.
//
// Guarded so typing in any input/select/textarea (e.g. the price filter
// fields, the preset-name prompt) never triggers a shortcut, and so nothing
// fires unless the Scanner page is actually the visible one.

const SHORTCUTS_HELP = [
  ['1 / 2 / 3', 'Switch market tab (US Stocks / Crypto / Futures)'],
  ['r', 'Refresh the active tab now'],
  ['e', 'Export CSV (US Stocks tab)'],
  ['w', 'Toggle Watchlist-only filter (US Stocks tab)'],
  ['?', 'Show this shortcut list'],
];

function scannerPageVisible(){
  const el = document.getElementById('page-scanner');
  return el && !el.hidden;
}
function activeMarketTab(){
  const tabs = document.getElementById('sc-market-tabs');
  return tabs ? tabs.dataset.value : 'stocks';
}
function clickIfPresent(id){
  const el = document.getElementById(id);
  if(el) el.click();
}
function showShortcutsHelp(){
  const lines = SHORTCUTS_HELP.map(([key, desc]) => `${key} — ${desc}`).join('\n');
  const status = document.getElementById(
    activeMarketTab() === 'crypto' ? 'crypto-status' : activeMarketTab() === 'futures' ? 'futures-status' : 'scanner-status'
  );
  if(status) status.textContent = 'Keyboard shortcuts: ' + SHORTCUTS_HELP.map(([k,d]) => `${k}=${d}`).join('  ·  ');
  else alert(lines);
}

document.addEventListener('keydown', (e) => {
  if(!scannerPageVisible()) return;
  if(e.ctrlKey || e.metaKey || e.altKey) return;
  const tag = document.activeElement?.tagName;
  if(tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

  const market = activeMarketTab();
  switch(e.key){
    case '1':
      document.querySelector('#sc-market-tabs .seg-btn[data-value="stocks"]')?.click();
      break;
    case '2':
      document.querySelector('#sc-market-tabs .seg-btn[data-value="crypto"]')?.click();
      break;
    case '3':
      document.querySelector('#sc-market-tabs .seg-btn[data-value="futures"]')?.click();
      break;
    case 'r':
    case 'R':
      if(market === 'crypto') clickIfPresent('crypto-refresh');
      else if(market === 'futures') clickIfPresent('futures-refresh');
      else clickIfPresent('scanner-refresh');
      break;
    case 'e':
    case 'E':
      if(market === 'stocks') clickIfPresent('scanner-export-csv');
      break;
    case 'w':
    case 'W':
      if(market === 'stocks'){
        const filter = document.getElementById('sc-watch-filter');
        const other = filter?.querySelector(`.seg-btn[data-value="${filter.dataset.value === 'watch' ? 'all' : 'watch'}"]`);
        other?.click();
      }
      break;
    case '?':
      showShortcutsHelp();
      break;
    default:
      return; // don't preventDefault for keys we don't handle
  }
  e.preventDefault();
});
