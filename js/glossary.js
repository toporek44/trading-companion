// ---------- Trading glossary (original definitions, for the Practice deck
// AND a standalone browsable reference page — see renderGlossaryPage) ----------
import { escapeHtml } from './state.js';
import { CANDLE_PATTERNS, renderCandleSVG } from './candle-drill.js';

export const CATEGORY_LABELS = {
  'order-types': 'Order Types',
  'indicators': 'Indicators & Chart',
  'risk': 'Risk & Sizing',
  'options': 'Options',
  'crypto': 'Crypto',
};

export const GLOSSARY_TERMS = [
  { id: 'market-order', term: 'Market order', category: 'order-types', definition: "An order that fills immediately at the best available price — guarantees execution, not price." },
  { id: 'limit-order', term: 'Limit order', category: 'order-types', definition: 'An order that only fills at a specified price or better — guarantees price, not execution.' },
  { id: 'stop-order', term: 'Stop order (stop-loss)', category: 'order-types', definition: 'An order that becomes a market order once price reaches a trigger level, used to cap a loss.' },
  { id: 'stop-limit-order', term: 'Stop-limit order', category: 'order-types', definition: 'A stop order that becomes a limit order (not a market order) once triggered — can fail to fill in a fast-moving market.' },
  { id: 'trailing-stop', term: 'Trailing stop', category: 'order-types', definition: "A stop order whose trigger price follows the market price by a fixed distance, locking in gains as price moves favorably." },
  { id: 'take-profit-order', term: 'Take-profit order', category: 'order-types', definition: 'An order that automatically closes a position once a target profit level is reached.' },
  { id: 'bid', term: 'Bid', category: 'order-types', definition: 'The highest price a buyer is currently willing to pay.' },
  { id: 'ask', term: 'Ask (offer)', category: 'order-types', definition: 'The lowest price a seller is currently willing to accept.' },
  { id: 'spread', term: 'Spread', category: 'order-types', definition: 'The gap between the best bid and the best ask.' },
  { id: 'slippage', term: 'Slippage', category: 'order-types', definition: 'The difference between the expected fill price and the actual fill price, usually from fast-moving or thin markets.' },
  { id: 'vwap', term: 'VWAP', category: 'indicators', definition: "Volume-Weighted Average Price — a running average price weighted by volume, reset each session; many intraday traders treat it as fair value." },
  { id: 'macd', term: 'MACD', category: 'indicators', definition: 'Moving Average Convergence Divergence — a momentum indicator built from the difference between two EMAs, plus a signal line.' },
  { id: 'rsi', term: 'RSI', category: 'indicators', definition: 'Relative Strength Index — a 0-100 momentum oscillator flagging overbought (above 70) and oversold (below 30) conditions.' },
  { id: 'ema', term: 'EMA', category: 'indicators', definition: 'Exponential Moving Average — weights recent prices more heavily than older ones, reacting faster than a simple average.' },
  { id: 'sma', term: 'SMA', category: 'indicators', definition: 'Simple Moving Average — the average price over a fixed lookback, with equal weight given to each period.' },
  { id: 'relative-volume', term: 'Relative volume', category: 'indicators', definition: "Today's volume compared to the average volume for the same time of day — a measure of unusual trading interest." },
  { id: 'float', term: 'Float', category: 'indicators', definition: "The shares of a company actually available for public trading, excluding closely-held or insider shares." },
  { id: 'market-cap', term: 'Market cap', category: 'indicators', definition: "A company's total share value — price per share multiplied by shares outstanding." },
  { id: 'support', term: 'Support', category: 'indicators', definition: 'A price level where buying pressure has historically stepped in, slowing or reversing a decline.' },
  { id: 'resistance', term: 'Resistance', category: 'indicators', definition: 'A price level where selling pressure has historically capped an advance.' },
  { id: 'level-2', term: 'Level 2', category: 'indicators', definition: "The order book display — every bid and ask by size, not just the single best price." },
  { id: 'time-and-sales', term: 'Time and Sales', category: 'indicators', definition: 'The scrolling log of trades that actually executed (the "tape") — price, size, and whether it hit the bid or ask.' },
  { id: 'tape-reading', term: 'Tape reading', category: 'indicators', definition: 'Interpreting Level 2 and Time and Sales together to gauge real-time buying and selling pressure.' },
  { id: 'candlestick', term: 'Candlestick', category: 'indicators', definition: "A chart element showing a period's open, high, low, and close — a body for the open-close range and wicks for the high/low extremes." },
  { id: 'wick', term: 'Wick (shadow)', category: 'indicators', definition: "The thin line above or below a candle's body, marking a high or low that was reached but not held at close." },
  { id: 'gap', term: 'Gap', category: 'indicators', definition: "A price jump between one period's close and the next period's open, leaving a visible break on the chart." },
  { id: 'volume', term: 'Volume', category: 'indicators', definition: 'The number of shares or contracts traded in a period — a measure of participation behind a price move.' },
  { id: 'atr', term: 'ATR', category: 'indicators', definition: 'Average True Range — the average size of a price move per period, often used to size stop distances by volatility.' },
  { id: 'ma-crossover', term: 'Moving average crossover', category: 'indicators', definition: 'A signal generated when a faster moving average crosses above or below a slower one.' },
  { id: 'divergence', term: 'Divergence', category: 'indicators', definition: "When price makes a new high or low but an indicator like RSI or MACD doesn't confirm it — often flagged as a weakening trend." },
  { id: 'consolidation', term: 'Consolidation', category: 'indicators', definition: 'A period where price trades in a tight range instead of trending, often just before a breakout.' },
  { id: 'breakout', term: 'Breakout', category: 'indicators', definition: 'Price moving decisively beyond a defined support or resistance level, often on higher volume.' },
  { id: 'pullback', term: 'Pullback', category: 'indicators', definition: 'A brief, shallow retracement against the prevailing trend before it resumes.' },
  { id: 'reversal', term: 'Reversal', category: 'indicators', definition: "A change in the direction of a security's prevailing price trend." },
  { id: 'trend-line', term: 'Trend line', category: 'indicators', definition: 'A line drawn connecting a series of highs or lows to visualize the direction and slope of a trend.' },
  { id: 'r-multiple', term: 'R-multiple', category: 'risk', definition: "A trade's profit or loss expressed as a multiple of the dollar amount risked (risking $50 to make $150 is +3R)." },
  { id: 'drawdown', term: 'Drawdown', category: 'risk', definition: "The decline from an account's peak value to a subsequent trough, usually shown as a percentage." },
  { id: 'expectancy', term: 'Expectancy', category: 'risk', definition: 'The average amount a trader expects to win or lose per trade, combining win rate with average win/loss size.' },
  { id: 'position-sizing', term: 'Position sizing', category: 'risk', definition: 'Deciding how many shares, contracts, or units to trade based on account risk tolerance, not just conviction.' },
  { id: 'risk-of-ruin', term: 'Risk of ruin', category: 'risk', definition: 'The probability that a strategy, over enough trades, empties the account given its risk-per-trade and edge.' },
  { id: 'win-rate', term: 'Win rate', category: 'risk', definition: 'The percentage of trades that close profitably.' },
  { id: 'reward-to-risk', term: 'Reward-to-risk ratio', category: 'risk', definition: "A trade's potential profit compared to its potential loss, set before entry." },
  { id: 'max-daily-loss', term: 'Max daily loss', category: 'risk', definition: 'A predetermined dollar or percentage loss limit that ends a trading session for the day once hit.' },
  { id: 'circuit-breaker', term: 'Personal circuit breaker', category: 'risk', definition: 'A self-imposed rule (like stopping after N consecutive losers) that halts trading to prevent emotional revenge-trading.' },
  { id: 'account-equity', term: 'Account equity', category: 'risk', definition: "The current total value of a trading account, including any open position's unrealized P&L." },
  { id: 'leverage', term: 'Leverage', category: 'risk', definition: 'Trading with borrowed capital so a given dollar move produces a larger percentage gain or loss on the trader\'s own capital.' },
  { id: 'margin-call', term: 'Margin call', category: 'risk', definition: "A broker's demand for additional funds when an account's equity falls below the required maintenance level." },
  { id: 'call-option', term: 'Call option', category: 'options', definition: 'A contract giving the right, but not the obligation, to buy an underlying asset at a set strike price by expiration.' },
  { id: 'put-option', term: 'Put option', category: 'options', definition: 'A contract giving the right, but not the obligation, to sell an underlying asset at a set strike price by expiration.' },
  { id: 'strike-price', term: 'Strike price', category: 'options', definition: 'The fixed price at which an option holder can buy (call) or sell (put) the underlying asset.' },
  { id: 'premium', term: 'Premium', category: 'options', definition: 'The price paid to buy an options contract.' },
  { id: 'expiration-date', term: 'Expiration date', category: 'options', definition: 'The date an options contract stops trading and is settled or expires worthless.' },
  { id: 'itm', term: 'In the money', category: 'options', definition: 'An option that would have intrinsic value if exercised right now (a call with strike below market, or a put with strike above market).' },
  { id: 'otm', term: 'Out of the money', category: 'options', definition: 'An option with no intrinsic value right now — it would expire worthless if it expired today.' },
  { id: 'implied-volatility', term: 'Implied volatility', category: 'options', definition: "The market's forecast of a security's future volatility, embedded in an option's price." },
  { id: 'theta-decay', term: 'Theta decay', category: 'options', definition: "The loss of an option's value over time as expiration approaches, all else equal." },
  { id: 'delta', term: 'Delta', category: 'options', definition: "How much an option's price is expected to move per $1 move in the underlying asset." },
  { id: 'assignment', term: 'Assignment', category: 'options', definition: 'Being obligated to fulfill an option contract\'s terms (buying or selling the underlying) when it is exercised against you.' },
  { id: 'open-interest', term: 'Open interest', category: 'options', definition: 'The total number of outstanding options contracts of a given strike and expiration that have not been closed or exercised.' },
  { id: 'spot-market', term: 'Spot market', category: 'crypto', definition: 'Buying or selling an asset for immediate delivery and ownership, as opposed to a derivative contract.' },
  { id: 'perpetual-futures', term: 'Perpetual futures', category: 'crypto', definition: 'A futures-like crypto contract with no expiration date, kept near the spot price via periodic funding payments.' },
  { id: 'funding-rate', term: 'Funding rate', category: 'crypto', definition: 'A periodic payment between long and short holders of a perpetual futures contract that keeps its price anchored to spot.' },
  { id: 'liquidation', term: 'Liquidation', category: 'crypto', definition: "The forced closure of a leveraged position by the exchange when losses erode the trader's margin below a maintenance threshold." },
  { id: 'order-book', term: 'Order book', category: 'crypto', definition: 'The live list of all open buy and sell orders for an asset, organized by price.' },
  { id: 'market-maker', term: 'Market maker', category: 'crypto', definition: 'A trader or firm that continuously posts both buy and sell orders to provide liquidity, profiting from the spread.' },
  { id: 'self-custody', term: 'Self-custody', category: 'crypto', definition: "Holding crypto in a personal wallet you control, as opposed to leaving it on an exchange (custodial risk)." },
];

export function getGlossaryCards(){
  return GLOSSARY_TERMS.map(t => ({ id: 'glossary:' + t.id, deck: 'glossary', term: t.term, definition: t.definition, category: t.category }));
}

// ---------- Standalone glossary reference page (search + category filter) ----------
// Separate from the Practice deck above — this is a plain lookup view, no
// spaced-repetition state, so it needs none of Practice's session/queue
// machinery. Category filter state is per-browser only (a display
// preference), same tier as Practice's own category filter.
const CANDLE_CATEGORY_LABELS = { bullish: 'Bullish', bearish: 'Bearish', neutral: 'Neutral' };

let glossaryTab = 'terms'; // 'terms' | 'candles'
let glossaryCategoryFilter = ''; // '' = all categories, scoped to the active tab
let glossarySearchQuery = '';

function glossaryFilteredTerms(){
  const q = glossarySearchQuery.trim().toLowerCase();
  return GLOSSARY_TERMS.filter(t => {
    if(glossaryCategoryFilter && t.category !== glossaryCategoryFilter) return false;
    if(!q) return true;
    return t.term.toLowerCase().includes(q) || t.definition.toLowerCase().includes(q);
  });
}

function glossaryFilteredCandles(){
  const q = glossarySearchQuery.trim().toLowerCase();
  return CANDLE_PATTERNS.filter(p => {
    if(glossaryCategoryFilter && p.cls !== glossaryCategoryFilter) return false;
    if(!q) return true;
    return p.name.toLowerCase().includes(q);
  });
}

function renderGlossaryPills(){
  const root = document.getElementById('glossary-category-pills');
  if(!root) return;
  const labels = glossaryTab === 'terms' ? CATEGORY_LABELS : CANDLE_CATEGORY_LABELS;
  const categories = Object.keys(labels);
  root.innerHTML = [
    `<button type="button" class="btn" data-category="" style="display:inline-block;width:auto;padding:5px 12px;font-size:.8rem;${glossaryCategoryFilter===''?'border-color:var(--accent);background:var(--accent-soft);color:var(--accent);':''}">All</button>`,
    ...categories.map(cat => `<button type="button" class="btn" data-category="${cat}" style="display:inline-block;width:auto;padding:5px 12px;font-size:.8rem;${glossaryCategoryFilter===cat?'border-color:var(--accent);background:var(--accent-soft);color:var(--accent);':''}">${escapeHtml(labels[cat])}</button>`),
  ].join('');
}

function renderGlossaryList(){
  const root = document.getElementById('glossary-list');
  if(!root) return;
  if(glossaryTab === 'candles'){
    const patterns = glossaryFilteredCandles();
    root.className = 'grid cols-4';
    if(patterns.length === 0){
      root.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div>No patterns match your search/filter.</div></div>`;
      return;
    }
    root.innerHTML = patterns.map(p => `
      <div class="card" style="text-align:center;">
        ${renderCandleSVG(p.candles)}
        <strong style="display:block;margin-top:6px;">${escapeHtml(p.name)}</strong>
        <span class="pill ${p.cls === 'bullish' ? 'good' : p.cls === 'bearish' ? 'bad' : 'neutral'}" style="margin-top:4px;">${escapeHtml(CANDLE_CATEGORY_LABELS[p.cls])}</span>
      </div>`).join('');
    return;
  }
  const terms = glossaryFilteredTerms();
  root.className = '';
  if(terms.length === 0){
    root.innerHTML = `<div class="empty-state"><div>No terms match your search/filter.</div></div>`;
    return;
  }
  root.innerHTML = terms.map(t => `
    <div class="card" style="margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap;">
        <strong>${escapeHtml(t.term)}</strong>
        <span class="pill neutral">${escapeHtml(CATEGORY_LABELS[t.category] || t.category)}</span>
      </div>
      <p style="margin:6px 0 0;color:var(--muted);font-size:.9rem;line-height:1.5;">${escapeHtml(t.definition)}</p>
    </div>`).join('');
}

export function renderGlossaryPage(){
  renderGlossaryPills();
  renderGlossaryList();
}

document.getElementById('glossary-search')?.addEventListener('input', (e) => {
  glossarySearchQuery = e.target.value;
  renderGlossaryList();
});
document.getElementById('glossary-category-pills')?.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-category]');
  if(!btn) return;
  glossaryCategoryFilter = btn.dataset.category;
  renderGlossaryPage();
});
document.getElementById('glossary-tabs')?.addEventListener('click', (e) => {
  const btn = e.target.closest('.seg-btn');
  if(!btn) return;
  const group = document.getElementById('glossary-tabs');
  group.dataset.value = btn.dataset.value;
  group.querySelectorAll('.seg-btn').forEach(b => b.classList.toggle('active', b === btn));
  glossaryTab = btn.dataset.value;
  glossaryCategoryFilter = '';
  glossarySearchQuery = '';
  document.getElementById('glossary-search').value = '';
  document.getElementById('glossary-search').placeholder = glossaryTab === 'terms' ? 'Search terms or definitions…' : 'Search pattern names…';
  renderGlossaryPage();
});

// '/' focuses search, 1/2 switch tabs — same shortcut vocabulary as the
// Scanner (tab switching) and Journal (search focus) elsewhere in this app.
document.addEventListener('keydown', (e) => {
  const page = document.getElementById('page-glossary');
  if(!page || page.hidden) return;
  if(e.ctrlKey || e.metaKey || e.altKey) return;
  const tag = document.activeElement?.tagName;
  if(tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

  if(e.key === '/'){
    document.getElementById('glossary-search')?.focus();
    e.preventDefault();
    return;
  }
  if(e.key === '1' || e.key === '2'){
    const value = e.key === '1' ? 'terms' : 'candles';
    document.getElementById('glossary-tabs')?.querySelector(`[data-value="${value}"]`)?.click();
    e.preventDefault();
  }
});
