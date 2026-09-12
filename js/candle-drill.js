// ---------- Candlestick Drill (per-browser practice, not synced) ----------
export const CANDLE_PATTERNS = [
  { name: 'Hammer', cls: 'bullish', type: 'single', candles: [{color:'g',bodyTop:15,bodyBottom:30,wickTop:10,wickBottom:95}] },
  { name: 'Inverted Hammer', cls: 'bullish', type: 'single', candles: [{color:'g',bodyTop:68,bodyBottom:83,wickTop:8,wickBottom:85}] },
  { name: 'Dragonfly Doji', cls: 'bullish', type: 'single', candles: [{color:'g',bodyTop:14,bodyBottom:16,wickTop:10,wickBottom:95}] },
  { name: 'Bullish Spinning Top', cls: 'bullish', type: 'single', candles: [{color:'g',bodyTop:40,bodyBottom:58,wickTop:12,wickBottom:88}] },
  { name: 'Bullish Engulfing', cls: 'bullish', type: 'double', candles: [{color:'r',bodyTop:40,bodyBottom:58,wickTop:35,wickBottom:62},{color:'g',bodyTop:22,bodyBottom:72,wickTop:18,wickBottom:76}] },
  { name: 'Tweezer Bottom', cls: 'bullish', type: 'double', candles: [{color:'r',bodyTop:30,bodyBottom:60,wickTop:25,wickBottom:88},{color:'g',bodyTop:32,bodyBottom:58,wickTop:28,wickBottom:88}] },
  { name: 'Morning Doji Star', cls: 'bullish', type: 'triple', candles: [{color:'r',bodyTop:20,bodyBottom:55,wickTop:15,wickBottom:58},{color:'n',bodyTop:68,bodyBottom:71,wickTop:60,wickBottom:80},{color:'g',bodyTop:25,bodyBottom:60,wickTop:20,wickBottom:64}] },
  { name: 'Three White Soldiers', cls: 'bullish', type: 'triple', candles: [{color:'g',bodyTop:70,bodyBottom:90,wickTop:66,wickBottom:92},{color:'g',bodyTop:50,bodyBottom:72,wickTop:46,wickBottom:74},{color:'g',bodyTop:30,bodyBottom:54,wickTop:26,wickBottom:56}] },
  { name: 'Morning Star', cls: 'bullish', type: 'triple', candles: [{color:'r',bodyTop:20,bodyBottom:55,wickTop:15,wickBottom:58},{color:'r',bodyTop:66,bodyBottom:76,wickTop:60,wickBottom:80},{color:'g',bodyTop:25,bodyBottom:60,wickTop:20,wickBottom:64}] },
  { name: 'Rising Three Methods', cls: 'bullish', type: 'triple', candles: [{color:'g',bodyTop:15,bodyBottom:55,wickTop:10,wickBottom:58},{color:'r',bodyTop:35,bodyBottom:45,wickTop:30,wickBottom:50},{color:'g',bodyTop:10,bodyBottom:52,wickTop:6,wickBottom:55}] },
  { name: 'Hanging Man', cls: 'bearish', type: 'single', candles: [{color:'r',bodyTop:15,bodyBottom:30,wickTop:10,wickBottom:95}] },
  { name: 'Shooting Star', cls: 'bearish', type: 'single', candles: [{color:'r',bodyTop:68,bodyBottom:83,wickTop:8,wickBottom:85}] },
  { name: 'Gravestone Doji', cls: 'bearish', type: 'single', candles: [{color:'r',bodyTop:83,bodyBottom:86,wickTop:8,wickBottom:86}] },
  { name: 'Bearish Spinning Top', cls: 'bearish', type: 'single', candles: [{color:'r',bodyTop:40,bodyBottom:58,wickTop:12,wickBottom:88}] },
  { name: 'Bearish Engulfing', cls: 'bearish', type: 'double', candles: [{color:'g',bodyTop:42,bodyBottom:60,wickTop:38,wickBottom:64},{color:'r',bodyTop:20,bodyBottom:70,wickTop:16,wickBottom:74}] },
  { name: 'Tweezer Tops', cls: 'bearish', type: 'double', candles: [{color:'g',bodyTop:32,bodyBottom:60,wickTop:10,wickBottom:64},{color:'r',bodyTop:30,bodyBottom:58,wickTop:10,wickBottom:66}] },
  { name: 'Evening Doji Star', cls: 'bearish', type: 'triple', candles: [{color:'g',bodyTop:45,bodyBottom:80,wickTop:42,wickBottom:84},{color:'n',bodyTop:28,bodyBottom:31,wickTop:20,wickBottom:42},{color:'r',bodyTop:40,bodyBottom:75,wickTop:36,wickBottom:78}] },
  { name: 'Three Black Crows', cls: 'bearish', type: 'triple', candles: [{color:'r',bodyTop:10,bodyBottom:30,wickTop:6,wickBottom:32},{color:'r',bodyTop:28,bodyBottom:50,wickTop:24,wickBottom:52},{color:'r',bodyTop:46,bodyBottom:68,wickTop:42,wickBottom:70}] },
  { name: 'Evening Star', cls: 'bearish', type: 'triple', candles: [{color:'g',bodyTop:45,bodyBottom:80,wickTop:42,wickBottom:84},{color:'g',bodyTop:24,bodyBottom:34,wickTop:20,wickBottom:42},{color:'r',bodyTop:40,bodyBottom:75,wickTop:36,wickBottom:78}] },
  { name: 'Falling Three Methods', cls: 'bearish', type: 'triple', candles: [{color:'r',bodyTop:45,bodyBottom:85,wickTop:40,wickBottom:88},{color:'g',bodyTop:55,bodyBottom:65,wickTop:50,wickBottom:70},{color:'r',bodyTop:48,bodyBottom:90,wickTop:44,wickBottom:92}] },
  { name: 'Doji', cls: 'neutral', type: 'single', candles: [{color:'n',bodyTop:48,bodyBottom:52,wickTop:8,wickBottom:92}] },
];

export function renderCandleSVG(candles){
  const colW = 40, gap = 10;
  const totalW = candles.length * colW + (candles.length - 1) * gap;
  const colorVar = c => c === 'g' ? 'var(--good)' : c === 'r' ? 'var(--bad)' : 'var(--muted)';
  const parts = candles.map((c, i) => {
    const x = i * (colW + gap);
    const cx = x + colW / 2;
    const col = colorVar(c.color);
    const bodyY = Math.min(c.bodyTop, c.bodyBottom);
    const bodyH = Math.max(1, Math.abs(c.bodyBottom - c.bodyTop));
    return `<line x1="${cx}" y1="${c.wickTop}" x2="${cx}" y2="${c.wickBottom}" stroke="${col}" stroke-width="2"/>`
      + `<rect x="${x}" y="${bodyY}" width="${colW}" height="${bodyH}" fill="${col}" stroke="${col}"/>`;
  }).join('');
  return `<svg viewBox="0 0 ${totalW} 100" style="width:100%;max-width:220px;height:160px;display:block;margin:0 auto;">${parts}</svg>`;
}

export function candleTodayStr(){ return new Date().toISOString().slice(0,10); }
export function loadCandleDrillStats(){
  let s = null;
  try{ s = JSON.parse(localStorage.getItem('tc-candle-drill-stats') || 'null'); }catch(e){ s = null; }
  if(!s || typeof s !== 'object') s = { today: candleTodayStr(), attempts:0, correct:0, bestStreak:0, currentStreak:0 };
  if(s.today !== candleTodayStr()){ s.today = candleTodayStr(); s.attempts = 0; s.correct = 0; s.currentStreak = 0; }
  if(typeof s.bestStreak !== 'number') s.bestStreak = 0;
  return s;
}
export function saveCandleDrillStats(s){
  try{ localStorage.setItem('tc-candle-drill-stats', JSON.stringify(s)); }catch(e){}
}
let candleDrillStats = loadCandleDrillStats();

export function pickCandleRound(){
  const idx = Math.floor(Math.random() * CANDLE_PATTERNS.length);
  const pattern = CANDLE_PATTERNS[idx];
  const rest = CANDLE_PATTERNS.filter((_, i) => i !== idx);
  for(let i = rest.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]]; }
  const options = [pattern.name, ...rest.slice(0, 3).map(p => p.name)];
  for(let i = options.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [options[i], options[j]] = [options[j], options[i]]; }
  return { pattern, options };
}

let candleDrillRound = pickCandleRound();
let candleDrillAnswered = null;

export function renderCandleDrill(){
  const body = document.getElementById('candle-drill-body');
  const statsEl = document.getElementById('candle-drill-stats');
  if(!body || !statsEl) return;
  const { pattern, options } = candleDrillRound;
  const answered = candleDrillAnswered;
  const optionsHtml = options.map(name => {
    let style = 'display:block;width:100%;text-align:left;margin-bottom:6px;';
    if(answered){
      if(name === pattern.name) style += 'border-color:var(--good);background:var(--good-soft);color:var(--good);';
      else if(name === answered) style += 'border-color:var(--bad);background:var(--bad-soft);color:var(--bad);';
    }
    return `<button type="button" class="btn" style="${style}" data-candle-opt="${name}" ${answered ? 'disabled' : ''}>${name}</button>`;
  }).join('');
  const feedback = answered
    ? `<div style="margin-top:10px;">${answered === pattern.name ? '<span class="pill good">correct</span>' : '<span class="pill bad">incorrect</span>'}
        <p style="color:var(--muted);font-size:.83rem;margin:6px 0 0;">${pattern.name} &mdash; ${pattern.cls}, ${pattern.type}-candle pattern.</p></div>
       <div class="form-actions"><button class="btn primary" type="button" data-action="candle-next">Next</button></div>`
    : '';
  body.innerHTML = `<div style="text-align:center;margin-bottom:10px;">${renderCandleSVG(pattern.candles)}</div>${optionsHtml}${feedback}`;
  statsEl.textContent = `Today: ${candleDrillStats.correct}/${candleDrillStats.attempts} correct · best streak ${candleDrillStats.bestStreak}`;
}

document.getElementById('candle-drill-body').addEventListener('click', (e) => {
  const optBtn = e.target.closest('button[data-candle-opt]');
  if(optBtn && !candleDrillAnswered){
    const chosen = optBtn.dataset.candleOpt;
    candleDrillAnswered = chosen;
    candleDrillStats = loadCandleDrillStats();
    candleDrillStats.attempts++;
    if(chosen === candleDrillRound.pattern.name){
      candleDrillStats.correct++;
      candleDrillStats.currentStreak++;
      candleDrillStats.bestStreak = Math.max(candleDrillStats.bestStreak, candleDrillStats.currentStreak);
    } else {
      candleDrillStats.currentStreak = 0;
    }
    saveCandleDrillStats(candleDrillStats);
    renderCandleDrill();
    return;
  }
  const nextBtn = e.target.closest('button[data-action="candle-next"]');
  if(nextBtn){
    candleDrillRound = pickCandleRound();
    candleDrillAnswered = null;
    renderCandleDrill();
  }
});

renderCandleDrill();
