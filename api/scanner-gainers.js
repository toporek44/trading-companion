// Vercel serverless function — proxies Financial Modeling Prep so the paid
// API key never ships in client-side code (unlike Alpha Vantage's free,
// consumer-facing design). Returns { configured: false } when FMP_API_KEY
// isn't set, so the client cleanly falls back to the Alpha Vantage flow.
// See docs/scanner-upgrade-plan.md for the full rationale.

const FMP_BASE = 'https://financialmodelingprep.com';

// Cap how many symbols get the expensive per-symbol float lookup — 15 per
// list keeps this well under FMP's Starter-tier rate limit even with the
// quote + float calls this makes on top of the two list calls.
const CANDIDATE_LIMIT = 15;

function shapeRow(raw, quoteBySymbol, floatBySymbol){
  const q = quoteBySymbol[raw.symbol] || {};
  const volume = q.volume != null ? q.volume : raw.volume;
  const avgVolume = q.avgVolume != null ? q.avgVolume : null;
  const floatShares = floatBySymbol[raw.symbol] != null ? floatBySymbol[raw.symbol] : null;
  return {
    ticker: raw.symbol,
    price: q.price != null ? q.price : raw.price,
    pct: q.changesPercentage != null ? q.changesPercentage : raw.changesPercentage,
    vol: volume != null ? Number(volume) : null,
    avgVolMAuto: avgVolume ? avgVolume / 1e6 : null,
    floatMAuto: floatShares ? floatShares / 1e6 : null,
  };
}

export default async function handler(req, res){
  const apiKey = process.env.FMP_API_KEY;
  if(!apiKey){ res.status(200).json({ configured: false }); return; }

  try{
    const [gainersRes, activesRes] = await Promise.all([
      fetch(`${FMP_BASE}/api/v3/stock_market/gainers?apikey=${apiKey}`),
      fetch(`${FMP_BASE}/api/v3/stock_market/actives?apikey=${apiKey}`),
    ]);
    const [gainersRaw, activesRaw] = await Promise.all([gainersRes.json(), activesRes.json()]);
    if(!Array.isArray(gainersRaw) || !Array.isArray(activesRaw)){
      res.status(502).json({ configured: true, error: 'Unexpected response from Financial Modeling Prep.' });
      return;
    }

    const gainersTop = gainersRaw.slice(0, CANDIDATE_LIMIT);
    const activesTop = activesRaw.slice(0, CANDIDATE_LIMIT);
    const symbols = [...new Set([...gainersTop, ...activesTop].map(r => r.symbol).filter(Boolean))];

    const quoteBySymbol = {};
    if(symbols.length){
      try{
        const quoteRes = await fetch(`${FMP_BASE}/api/v3/quote/${symbols.join(',')}?apikey=${apiKey}`);
        const quotes = await quoteRes.json();
        (Array.isArray(quotes) ? quotes : []).forEach(q => { quoteBySymbol[q.symbol] = q; });
      }catch(e){ /* quotes are best-effort; rows fall back to list-endpoint fields */ }
    }

    // Float is a separate per-symbol endpoint — fetch in parallel, tolerate
    // individual failures so one bad symbol doesn't break the whole scan.
    const floatBySymbol = {};
    await Promise.all(symbols.map(async (sym) => {
      try{
        const r = await fetch(`${FMP_BASE}/api/v4/shares_float?symbol=${sym}&apikey=${apiKey}`);
        const d = await r.json();
        const entry = Array.isArray(d) ? d[0] : d;
        if(entry && entry.floatShares) floatBySymbol[sym] = entry.floatShares;
      }catch(e){ /* skip this symbol's float */ }
    }));

    res.status(200).json({
      configured: true,
      fetchedAt: Date.now(),
      top_gainers: gainersTop.map(r => shapeRow(r, quoteBySymbol, floatBySymbol)),
      most_actively_traded: activesTop.map(r => shapeRow(r, quoteBySymbol, floatBySymbol)),
    });
  }catch(err){
    res.status(502).json({ configured: true, error: 'Could not reach Financial Modeling Prep.' });
  }
}
