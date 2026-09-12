// ---------- Candlestick pattern data + shared rendering (used by the Practice deck) ----------
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

function slug(name){
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function getCandleCards(){
  return CANDLE_PATTERNS.map(p => ({ id: 'candle:' + slug(p.name), deck: 'candle', name: p.name, cls: p.cls, type: p.type, candles: p.candles }));
}
