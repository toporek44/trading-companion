// Vercel serverless function — proxies Finnhub's company-news endpoint so
// its key stays server-side. Returns { configured: false } when
// FINNHUB_API_KEY isn't set, so the client falls back to the Alpha Vantage
// NEWS_SENTIMENT flow. See docs/scanner-upgrade-plan.md.

export default async function handler(req, res){
  const apiKey = process.env.FINNHUB_API_KEY;
  if(!apiKey){ res.status(200).json({ configured: false }); return; }

  const symbol = String(req.query.symbol || '').toUpperCase().trim();
  if(!symbol){ res.status(400).json({ configured: true, error: 'Missing symbol' }); return; }

  try{
    const to = new Date();
    const from = new Date(to.getTime() - 3 * 24 * 60 * 60 * 1000); // last 3 days
    const fmt = (d) => d.toISOString().slice(0, 10);
    const url = `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(symbol)}&from=${fmt(from)}&to=${fmt(to)}&token=${apiKey}`;
    const r = await fetch(url);
    const data = await r.json();
    if(!Array.isArray(data) || data.length === 0){
      res.status(200).json({ configured: true, headline: null, hoursOld: null });
      return;
    }
    // Finnhub's order isn't guaranteed newest-first — pick the max datetime explicitly.
    const latest = data.reduce((a, b) => (b && b.datetime > (a && a.datetime || 0) ? b : a), null);
    const hoursOld = latest && latest.datetime ? (Date.now() / 1000 - latest.datetime) / 3600 : null;
    res.status(200).json({ configured: true, headline: (latest && latest.headline) || null, hoursOld });
  }catch(err){
    res.status(502).json({ configured: true, error: 'Could not reach Finnhub.' });
  }
}
