// Vercel serverless function — proxies Finviz Elite's "Groups" sector
// performance export (grp_export.ashx?g=sector), the same data behind
// Finviz Elite's own "Groups" tab (a feature named in this app's own
// competitive-positioning doc as something a free scanner couldn't show).
// Verified live 2026-09-14: this is a genuinely different endpoint from
// the ticker screener export (export.ashx) — different base path, own
// column set, one row per sector rather than per stock.
//
// Returns { configured: false } when FINVIZ_API_KEY isn't set, matching
// scanner-gainers.js's own contract.
import { parseCsv, findCol, toNumber } from './_lib/finviz.js';

function shapeSectorRow(row){
  return {
    name: findCol(row, 'Name'),
    changeToday: toNumber(findCol(row, 'Change')),
    changeWeek: toNumber(findCol(row, 'Performance (Week)')),
    changeMonth: toNumber(findCol(row, 'Performance (Month)')),
    relVol: toNumber(findCol(row, 'Relative Volume')),
  };
}

export default async function handler(req, res){
  const apiKey = process.env.FINVIZ_API_KEY;
  if(!apiKey){ res.status(200).json({ configured: false }); return; }

  try{
    const url = `https://elite.finviz.com/grp_export.ashx?g=sector&v=140&o=-change&auth=${apiKey}`;
    const r = await fetch(url);
    const text = await r.text();
    if(!r.ok || /<html/i.test(text)){
      throw new Error('Unexpected response from Finviz Groups export.');
    }
    const sectors = parseCsv(text).map(shapeSectorRow).filter(s => s.name && s.changeToday != null);
    res.status(200).json({ configured: true, fetchedAt: Date.now(), sectors });
  }catch(err){
    res.status(502).json({ configured: true, error: String(err && err.message || 'Could not reach Finviz.') });
  }
}
