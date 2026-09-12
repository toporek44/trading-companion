// Vercel serverless function — proxies Finviz Elite's screener export so
// the paid API key never ships in client-side code. Returns
// { configured: false } when FINVIZ_API_KEY isn't set, so the client shows
// a clear "not configured" status instead of silently doing nothing (there
// is no fallback data source — Alpha Vantage was removed entirely, see
// docs/scanner-upgrade-plan.md).
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
// range (see below), up >=10% (the real Pillar #2 bar — tightened from an
// earlier >=4% "catch it moving" net after user feedback that the list
// should lead with genuine 10%+ movers, not pad rows down to 4%), float
// under 20M, and relative volume over 2x (a broader net; the Pillars badge
// itself still requires >=5x for full credit). Confirmed live:
// `sh_float_u20` and `sh_relvol_o2` correctly cut a ~356-row unfiltered
// result down to ~37 qualified rows.
//
// Price range is NOT a fixed constant — it's read from Supabase (same
// 'scanner-price-range' row the Scanner tab's Min/Max price fields write
// to via persistProgress in js/scanner.js), so editing it once in the app
// changes what this live fetch pulls too, not just a client-side display
// filter. Falls back to $2-$20 (Ross Cameron's stated range) if unset.
// Set FINVIZ_FILTERS env var to bypass this entirely with a fixed string.

import { getPriceRange } from './_lib/supabase.js';
import { DEFAULT_COLUMNS, fetchFinvizRows } from './_lib/finviz.js';

const OTHER_FILTERS = 'ta_change_u10,sh_float_u20,sh_relvol_o2';
const ROW_LIMIT = 30;

export default async function handler(req, res){
  const apiKey = process.env.FINVIZ_API_KEY;
  if(!apiKey){ res.status(200).json({ configured: false }); return; }

  const columns = process.env.FINVIZ_COLUMNS || DEFAULT_COLUMNS;
  let filters = process.env.FINVIZ_FILTERS;
  if(!filters){
    const { min, max } = await getPriceRange();
    // Finviz's price filter is a single "NtoM" range token (whole dollars),
    // NOT separate "_oN"/"_uN" over/under tokens like sh_float/sh_relvol
    // use — verified live: sh_price_oN/_uN are silently ignored (no error,
    // just no filtering), while sh_price_NtoM correctly bounds results.
    filters = `sh_price_${Math.round(min)}to${Math.round(max)},${OTHER_FILTERS}`;
  }

  try{
    const rows = await fetchFinvizRows(apiKey, filters, columns);
    const byChange = rows.slice().sort((a, b) => Math.abs(b.pct||0) - Math.abs(a.pct||0));
    const byVolume = rows.slice().sort((a, b) => (b.vol||0) - (a.vol||0));

    res.status(200).json({
      configured: true,
      fetchedAt: Date.now(),
      top_gainers: byChange.slice(0, ROW_LIMIT),
      most_actively_traded: byVolume.slice(0, ROW_LIMIT),
    });
  }catch(err){
    res.status(502).json({ configured: true, error: String(err && err.message || 'Could not reach Finviz.') });
  }
}
