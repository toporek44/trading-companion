// Shared helpers for Vercel serverless functions under api/. Files prefixed
// with "_" (this directory) are never turned into routes by Vercel, so this
// is safe to import from api/scanner-gainers.js and api/check-alerts.js
// without creating a stray endpoint. Extracted after both files had carried
// byte-for-byte identical copies of SUPABASE_URL/SUPABASE_ANON_KEY/
// getPriceRange() since the price-range feature was added — one source of
// truth now instead of two copies that could silently drift apart.

export const SUPABASE_URL = "https://wcqickazhkxgyofyqnxq.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjcWlja2F6aGt4Z3lvZnlxbnhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5Njc4MjUsImV4cCI6MjEwNDU0MzgyNX0.6o4MmgXZTfuXrvK5sEXYUUJk_wYY64xgE-PnE6IxcVc";

// The Scanner tab's Min/Max price fields write here (js/scanner.js,
// persistProgress('scanner-price-range', ...)) so both the live-fetch
// filter (scanner-gainers.js) and the Telegram alert check (check-alerts.js)
// read the same value instead of separately hardcoded copies. Falls back to
// $2-$20 (Ross Cameron's stated range) if unset or unreachable.
export async function getPriceRange(){
  try{
    const res = await fetch(`${SUPABASE_URL}/rest/v1/progress?key=eq.scanner-price-range&select=state`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    });
    const rows = await res.json();
    const s = Array.isArray(rows) && rows[0] && rows[0].state;
    return { min: (s && s.min != null) ? s.min : 2, max: (s && s.max != null) ? s.max : 20 };
  }catch(e){
    return { min: 2, max: 20 };
  }
}
