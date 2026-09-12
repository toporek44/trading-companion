// Shared Finviz Elite CSV-export parsing for api/scanner-gainers.js and
// api/check-alerts.js. Extracted after both files carried byte-for-byte
// identical copies of parseCsv/findCol/toNumber/shapeRow — the same class
// of duplication already fixed once this session for getPriceRange (see
// _lib/supabase.js). Any future Finviz quirk fix (the price-filter-syntax
// bug found earlier this session is exactly this kind of thing) now only
// needs to happen once instead of twice.

export const DEFAULT_COLUMNS = '1,65,66,67,63,64,25,30,31'; // Ticker, Price, Change, Volume, Avg Volume, Rel Volume, Shares Float, Short Float, Short Ratio

export function parseCsv(text){
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

export function findCol(row, ...candidateNames){
  const keys = Object.keys(row);
  for(const name of candidateNames){
    const key = keys.find(k => k.toLowerCase() === name.toLowerCase());
    if(key) return row[key];
  }
  return null;
}

export function toNumber(v){
  if(v == null || v === '' || v === '-') return null;
  const n = parseFloat(String(v).replace(/[%,]/g, ''));
  return isNaN(n) ? null : n;
}

// Verified live against a real Finviz Elite export (2026-09-12): unlike the
// Finviz UI, the raw CSV export has NO K/M/B suffix letters — each column
// uses a fixed implicit scale instead. Confirmed by cross-checking against
// Finviz's own Relative Volume figure: Volume is a plain share count,
// Average Volume is in THOUSANDS of shares (e.g. "1315.11" = 1,315,110),
// and Shares Float is in MILLIONS (e.g. "45.54" = 45.54M — this already
// matches this app's own floatM convention directly).
export function shapeRow(row){
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
    // check-alerts.js doesn't use these two fields but they're harmless to
    // carry through — one shapeRow shape for both callers.
    shortFloatPct: toNumber(findCol(row, 'Short Float')),
    shortRatio: toNumber(findCol(row, 'Short Ratio')),
  };
}

// Full fetch → parse → shape → filter pipeline shared by both callers.
// Halted/no-trade tickers come back from Finviz with "-" for Change/Volume,
// which toNumber() turns into null — excluded here (not just checking
// price) so that null never reaches client code that calls
// .toFixed()/.toLocaleString() on it unguarded (a real bug found and fixed
// this session).
export async function fetchFinvizRows(apiKey, filters, columns = DEFAULT_COLUMNS){
  const url = `https://elite.finviz.com/export.ashx?v=152&f=${filters}&ft=4&c=${columns}&auth=${apiKey}`;
  const r = await fetch(url);
  const text = await r.text();
  if(!r.ok || /<html/i.test(text)){
    throw new Error('Unexpected response from Finviz — check FINVIZ_API_KEY, FINVIZ_COLUMNS, and FINVIZ_FILTERS.');
  }
  return parseCsv(text).map(shapeRow).filter(r => r.ticker && r.price != null && r.pct != null && r.vol != null);
}
