// Vercel serverless function — proxies CoinGecko's public markets endpoint
// so the client doesn't hit CORS/rate-limit issues directly. No API key
// needed (CoinGecko's public tier is enough for this use case: one fetch
// every 60s, one user). Crypto trades 24/7, so this is what fills the
// "market closed" gap the US-stock Finviz scanner has overnight/weekends.

const COINGECKO_URL = 'https://api.coingecko.com/api/v3/coins/markets'
  + '?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&price_change_percentage=24h';

export default async function handler(req, res){
  try{
    const r = await fetch(COINGECKO_URL, { headers: { accept: 'application/json' } });
    if(!r.ok){
      res.status(502).json({ error: `CoinGecko returned ${r.status}` });
      return;
    }
    const data = await r.json();
    const rows = (Array.isArray(data) ? data : [])
      .filter(c => c && c.current_price != null)
      .map(c => ({
        symbol: (c.symbol || '').toUpperCase(),
        name: c.name,
        price: c.current_price,
        pct: c.price_change_percentage_24h,
        volume: c.total_volume,
        marketCap: c.market_cap,
        image: c.image || null,
      }));
    const byChange = rows.slice().filter(c => c.pct != null).sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));
    const byVolume = rows.slice().sort((a, b) => (b.volume||0) - (a.volume||0));
    res.status(200).json({
      configured: true,
      fetchedAt: Date.now(),
      top_gainers: byChange.slice(0, 30),
      most_active: byVolume.slice(0, 30),
    });
  }catch(err){
    res.status(502).json({ error: 'Could not reach CoinGecko.' });
  }
}
