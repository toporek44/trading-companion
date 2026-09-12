// Vercel serverless function — crypto news, per coin. No paid crypto news
// API is free/no-key (CryptoCompare/CryptoPanic/CoinGecko news all require
// a key or block un-authed requests — verified live, all 401/403'd).
// Cointelegraph's per-tag RSS feed (https://cointelegraph.com/rss/tag/<slug>)
// is public and needs no key, so this parses that feed's <item> blocks with
// a small regex parser (no XML library — Vercel functions have no npm deps
// here) instead. Coin tag slugs are the coin's lowercase name with spaces
// turned into hyphens (e.g. "Bitcoin Cash" -> "bitcoin-cash"); a slug with
// no matching tag just returns no items, not an error.

const ENTITY_MAP = { amp:'&', lt:'<', gt:'>', quot:'"', 39:"'", 8217:'’', 8216:'‘', 8220:'“', 8221:'”', 8212:'—', 8211:'–' };
function decodeEntities(s){
  return String(s)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&(#(\d+)|[a-z]+);/gi, (m, whole, num) => ENTITY_MAP[num || whole.toLowerCase()] || m)
    .trim();
}

function parseRssItems(xml, limit){
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while(items.length < limit && (m = itemRegex.exec(xml))){
    const block = m[1];
    const title = (block.match(/<title>([\s\S]*?)<\/title>/) || [])[1];
    const link = (block.match(/<link>([\s\S]*?)<\/link>/) || [])[1];
    const pubDate = (block.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1];
    if(!title || !pubDate) continue;
    const ts = Math.floor(new Date(pubDate.trim()).getTime() / 1000);
    if(!ts) continue;
    items.push({ headline: decodeEntities(title), url: link ? decodeEntities(link) : null, source: 'Cointelegraph', datetime: ts });
  }
  return items;
}

export default async function handler(req, res){
  const slug = String(req.query.slug || '').toLowerCase().trim();
  if(!slug){ res.status(400).json({ error: 'Missing slug' }); return; }
  try{
    const r = await fetch(`https://cointelegraph.com/rss/tag/${encodeURIComponent(slug)}`);
    if(!r.ok){ res.status(200).json({ items: [] }); return; } // no tag for this coin — not an error
    const xml = await r.text();
    const now = Date.now() / 1000;
    const items = parseRssItems(xml, 3).map(it => ({ ...it, hoursOld: (now - it.datetime) / 3600 }));
    res.status(200).json({ items });
  }catch(err){
    res.status(502).json({ error: 'Could not reach Cointelegraph.' });
  }
}
