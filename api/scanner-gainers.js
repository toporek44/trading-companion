// Vercel serverless function — proxies Finviz Elite's screener export so
// the paid API key never ships in client-side code. Returns
// { configured: false } when FINVIZ_API_KEY isn't set, so the client
// falls back to the Alpha Vantage flow. See docs/scanner-upgrade-plan.md.
//
// Column IDs (FINVIZ_COLUMNS) are Finviz's numeric `c=` export codes,
// requested against the "Custom" view (v=152 — the fixed "Overview" view,
// v=111, ignores c= and always returns its own default column set). All 9
// default columns below were confirmed live against a real Finviz Elite
// export on 2026-09-12: 1=Ticker, 65=Price, 66=Change, 67=Volume,
// 63=Average Volume, 64=Relative Volume, 25=Shares Float, 30=Short Float,
// 31=Short Ratio. Parsing is done BY HEADER NAME (not position), so a
// different FINVIZ_COLUMNS value (env var) is picked up automatically
// with zero code changes.
//
// Server-side filters (FINVIZ_FILTERS) pre-qualify candidates against the
// strategy's hard requirements before they ever reach the client: price
// $1-$20, up >=4% (a broad "catch it moving" net — the Pillars badge
// still requires >=10% for full credit), float under 20M, and relative
// volume over 2x (again a broad net; the Pillars badge requires >=5x).
// Confirmed live: `sh_float_u20` and `sh_relvol_o2` correctly cut a
// ~356-row unfiltered result down to ~37 float/volume-qualified rows.

const DEFAULT_COLUMNS = '1,65,66,67,63,64,25,30,31'; // Ticker, Price, Change, Volume, Avg Volume, Rel Volume, Shares Float, Short Float, Short Ratio
// Price $1-$20, up >=4% on the day — mirrors this app's own default
// Scanner filters (see the Filters card in the Scanner tab).
const DEFAULT_FILTERS = 'sh_price_o1,sh_price_u20,ta_change_u4,sh_float_u20,sh_relvol_o2';
const ROW_LIMIT = 30;

function parseCsv(text){
  const lines = text.trim().split(/\r?\n/);
  if(lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
  return lines.slice(1).map(line => {
    const cells = line.split(','); // ticker/numeric columns here never contain embedded commas
    const row = {};
    headers.forEach((h, i) => { row[h] = cells[i] != null ? cells[i].replace(/^"|"$/g, '').trim() : ''; });
    return row;
  });
}

function findCol(row, ...candidateNames){
  const keys = Object.keys(row);
  for(const name of candidateNames){
    const key = keys.find(k => k.toLowerCase() === name.toLowerCase());
    if(key) return row[key];
  }
  return null;
}

function toNumber(v){
  if(v == null || v === '' || v === '-') return null;
  const n = parseFloat(String(v).replace(/[%,]/g, ''));
  return isNaN(n) ? null : n;
}

// Verified live against a real Finviz Elite export (2026-09-12): unlike
// the Finviz UI, the raw CSV export has NO K/M/B suffix letters — each
// column uses a fixed implicit scale instead. Confirmed by cross-checking
// against Finviz's own Relative Volume figure: Volume is a plain share
// count, Average Volume is in THOUSANDS of shares (e.g. "1315.11" =
// 1,315,110), and Shares Float is in MILLIONS (e.g. "45.54" = 45.54M —
// this already matches this app's own floatM convention directly).
function shapeRow(row){
  const vol = toNumber(findCol(row, 'Volume'));
  const avgVolThousands = toNumber(findCol(row, 'Average Volume', 'Avg Volume'));
  const floatM = toNumber(findCol(row, 'Shares Float', 'Shs Float', 'Float'));
  const relVolFromFinviz = toNumber(findCol(row, 'Relative Volume', 'Rel Volume'));
  // avgVolMAuto feeds js/scanner.js's existing relVol = vol/(avgVolM*1e6)
  // formula, so prefer real average volume; if only Finviz's own relative
  // volume figure came back, back-derive an equivalent average volume so
  // that same formula still reproduces it.
  const avgVolMAuto = avgVolThousands != null ? avgVolThousands / 1000
    : (relVolFromFinviz && vol ? (vol / relVolFromFinviz) / 1e6 : null);
  return {
    ticker: findCol(row, 'Ticker'),
    price: toNumber(findCol(row, 'Price')),
    pct: toNumber(findCol(row, 'Change')),
    vol,
    avgVolMAuto,
    floatMAuto: floatM,
    // Short Float (%) and Short Ratio (days-to-cover) — the two fields
    // Ross Cameron's video explicitly names as what a real paid scanner
    // shows that a free one can't; verified live as Finviz columns 30/31.
    shortFloatPct: toNumber(findCol(row, 'Short Float')),
    shortRatio: toNumber(findCol(row, 'Short Ratio')),
  };
}

export default async function handler(req, res){
  const apiKey = process.env.FINVIZ_API_KEY;
  if(!apiKey){ res.status(200).json({ configured: false }); return; }

  const columns = process.env.FINVIZ_COLUMNS || DEFAULT_COLUMNS;
  const filters = process.env.FINVIZ_FILTERS || DEFAULT_FILTERS;

  try{
    const url = `https://elite.finviz.com/export.ashx?v=152&f=${filters}&ft=4&c=${columns}&auth=${apiKey}`;
    const r = await fetch(url);
    const text = await r.text();
    if(!r.ok || /<html/i.test(text)){
      res.status(502).json({ configured: true, error: 'Unexpected response from Finviz — check FINVIZ_API_KEY, FINVIZ_COLUMNS, and FINVIZ_FILTERS.' });
      return;
    }
    const rows = parseCsv(text).map(shapeRow).filter(r => r.ticker && r.price != null);
    const byChange = rows.slice().sort((a, b) => Math.abs(b.pct||0) - Math.abs(a.pct||0));
    const byVolume = rows.slice().sort((a, b) => (b.vol||0) - (a.vol||0));

    res.status(200).json({
      configured: true,
      fetchedAt: Date.now(),
      top_gainers: byChange.slice(0, ROW_LIMIT),
      most_actively_traded: byVolume.slice(0, ROW_LIMIT),
    });
  }catch(err){
    res.status(502).json({ configured: true, error: 'Could not reach Finviz.' });
  }
}
