// Vercel serverless function — futures quotes for a fixed watchlist of
// major CME/CBOT/NYMEX/COMEX contracts. Futures don't have a "top gainers
// screener" the way stocks/crypto do (a few dozen liquid contracts total,
// not thousands of tickers) — so instead of screening, this fetches a
// curated watchlist and ranks by |% change| so the biggest mover is #1.
//
// Data source: Yahoo Finance's public v8 chart endpoint (no key, no auth)
// — verified live 2026-09-12. Yahoo's newer v7/quote endpoint now requires
// a session crumb and 401s unauthenticated; the older v8/chart endpoint
// per-symbol still works with a plain fetch, so this calls it once per
// watchlist symbol in parallel.
//
// Macro news: futures move on shared macro catalysts (Fed decisions, CPI,
// jobs reports, OPEC, geopolitical events) rather than single-contract
// news the way a stock has its own earnings — so this reuses Finnhub's
// general-market news category (same FINHUB_API_KEY already configured
// for the stock scanner) as one shared "what's moving markets" feed
// instead of trying to fetch separate news per contract.

const WATCHLIST = [
  { symbol: 'ES=F', label: 'E-mini S&P 500', group: 'Index' },
  { symbol: 'NQ=F', label: 'E-mini Nasdaq 100', group: 'Index' },
  { symbol: 'YM=F', label: 'E-mini Dow', group: 'Index' },
  { symbol: 'RTY=F', label: 'E-mini Russell 2000', group: 'Index' },
  { symbol: 'CL=F', label: 'Crude Oil (WTI)', group: 'Energy' },
  { symbol: 'NG=F', label: 'Natural Gas', group: 'Energy' },
  { symbol: 'GC=F', label: 'Gold', group: 'Metals' },
  { symbol: 'SI=F', label: 'Silver', group: 'Metals' },
  { symbol: 'HG=F', label: 'Copper', group: 'Metals' },
  { symbol: 'ZB=F', label: '30Y T-Bond', group: 'Rates' },
  { symbol: 'ZN=F', label: '10Y T-Note', group: 'Rates' },
  { symbol: '6E=F', label: 'Euro FX', group: 'Currency' },
  { symbol: '6J=F', label: 'Japanese Yen', group: 'Currency' },
  { symbol: 'BTC=F', label: 'Bitcoin Futures', group: 'Crypto' },
];

async function fetchQuote(symbol){
  try{
    const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if(!r.ok) return null;
    const data = await r.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if(!meta || meta.regularMarketPrice == null) return null;
    return {
      symbol,
      price: meta.regularMarketPrice,
      pct: meta.regularMarketChangePercent ?? (meta.chartPreviousClose ? ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100 : null),
      volume: meta.regularMarketVolume ?? null,
      contractName: meta.shortName || symbol,
      exchange: meta.fullExchangeName || meta.exchangeName || null,
    };
  }catch(err){
    return null;
  }
}

async function fetchMacroNews(){
  const apiKey = process.env.FINHUB_API_KEY;
  if(!apiKey) return { configured: false, items: [] };
  try{
    const r = await fetch(`https://finnhub.io/api/v1/news?category=general&token=${apiKey}`);
    const data = await r.json();
    const now = Date.now() / 1000;
    const items = (Array.isArray(data) ? data : [])
      .filter(a => a && a.datetime)
      .sort((a, b) => b.datetime - a.datetime)
      .slice(0, 5)
      .map(a => ({ headline: a.headline || null, url: a.url || null, source: a.source || null, datetime: a.datetime, hoursOld: (now - a.datetime) / 3600 }));
    return { configured: true, items };
  }catch(err){
    return { configured: true, items: [] };
  }
}

export default async function handler(req, res){
  try{
    const [quotes, macro] = await Promise.all([
      Promise.all(WATCHLIST.map(w => fetchQuote(w.symbol))),
      fetchMacroNews(),
    ]);
    const contracts = WATCHLIST.map((w, i) => quotes[i] ? { ...w, ...quotes[i] } : null)
      .filter(Boolean)
      .sort((a, b) => Math.abs(b.pct ?? 0) - Math.abs(a.pct ?? 0));
    res.status(200).json({ configured: true, fetchedAt: Date.now(), contracts, macroNews: macro });
  }catch(err){
    res.status(502).json({ error: 'Could not reach the futures data source.' });
  }
}
