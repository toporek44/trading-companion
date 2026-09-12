// Vercel serverless function — proxies Finnhub's company-news endpoint so
// its key stays server-side. Returns { configured: false } when
// FINHUB_API_KEY isn't set, so the client falls back to the Alpha Vantage
// NEWS_SENTIMENT flow. See docs/scanner-upgrade-plan.md.

export default async function handler(req, res){
  const apiKey = process.env.FINHUB_API_KEY;
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
      res.status(200).json({ configured: true, headline: null, hoursOld: null, items: [] });
      return;
    }
    // Finnhub's order isn't guaranteed newest-first — sort explicitly, then
    // take the 3 most recent so the client can show a short history per
    // ticker, not just a single "latest" headline.
    const items = data
      .filter(a => a && a.datetime)
      .sort((a, b) => b.datetime - a.datetime)
      .slice(0, 3)
      .map(a => ({
        headline: a.headline || null,
        url: a.url || null,
        source: a.source || null,
        datetime: a.datetime, // unix seconds, exact — client renders local date/time from this
        hoursOld: (Date.now() / 1000 - a.datetime) / 3600,
      }));
    const latest = items[0] || null;
    res.status(200).json({
      configured: true,
      items,
      headline: latest ? latest.headline : null,
      hoursOld: latest ? latest.hoursOld : null,
    });
  }catch(err){
    res.status(502).json({ configured: true, error: 'Could not reach Finnhub.' });
  }
}
