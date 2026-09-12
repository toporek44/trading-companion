// Vercel serverless function — meant to be hit on a schedule by an
// external free scheduler (e.g. cron-job.org), since Vercel's own Hobby-
// plan Cron Jobs are capped at once/day, far too infrequent for catching
// an intraday mover. See docs/scanner-upgrade-plan.md for the full design.
//
// Runs the same 5-Pillars scan as the Scanner tab, but server-side and
// independent of any open browser tab, and sends a Telegram message for
// any ticker that newly qualifies today. Dedup state is stored in the
// same Supabase `progress` table the rest of the app already uses (key
// 'telegram-alerts-fired', value {date, fired: {"TICKER|cond": true}}) —
// no schema migration needed, no new table.
//
// Requires FINVIZ_API_KEY, FINHUB_API_KEY (already configured), plus
// TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID (new). Returns 200 with a
// {ok:false, reason:'not configured', missing:{...}} body if any are
// unset, rather than partially running.

const SUPABASE_URL = "https://wcqickazhkxgyofyqnxq.supabase.co";
// Public anon key — the same one already embedded in js/state.js and
// shipped to every browser; safe to duplicate here, not a new secret.
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjcWlja2F6aGt4Z3lvZnlxbnhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5Njc4MjUsImV4cCI6MjEwNDU0MzgyNX0.6o4MmgXZTfuXrvK5sEXYUUJk_wYY64xgE-PnE6IxcVc";

const FINVIZ_BASE = 'https://elite.finviz.com';
const DEFAULT_COLUMNS = '1,65,66,67,63,64,25,30,31';
const DEFAULT_FILTERS = 'sh_price_o1,sh_price_u20,ta_change_u4,sh_float_u20,sh_relvol_o2';
const NEWS_CHECK_LIMIT = 15; // bound Finnhub calls per run to the top N candidates by change%
const SCANNER_RELVOL_PILLAR_MIN = 5;

function parseCsv(text){
  const lines = text.trim().split(/\r?\n/);
  if(lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
  return lines.slice(1).map(line => {
    const cells = line.split(',');
    const row = {};
    headers.forEach((h, i) => { row[h] = cells[i] != null ? cells[i].replace(/^"|"$/g, '').trim() : ''; });
    return row;
  });
}
function findCol(row, ...names){
  const keys = Object.keys(row);
  for(const name of names){
    const key = keys.find(k => k.toLowerCase() === name.toLowerCase());
    if(key) return row[key];
  }
  return null;
}
function toNumber(v){
  if(v == null || v === '' || v === '-') return null;
  const n = parseFloat(String(v).replace(/[%,]/g, ''));
  return isNaN(n) ? null : n;
}
function shapeRow(row){
  const vol = toNumber(findCol(row, 'Volume'));
  const avgVolThousands = toNumber(findCol(row, 'Average Volume', 'Avg Volume'));
  const floatM = toNumber(findCol(row, 'Shares Float', 'Shs Float', 'Float'));
  const relVolFromFinviz = toNumber(findCol(row, 'Relative Volume', 'Rel Volume'));
  const avgVolMAuto = avgVolThousands != null ? avgVolThousands / 1000
    : (relVolFromFinviz && vol ? (vol / relVolFromFinviz) / 1e6 : null);
  return {
    ticker: findCol(row, 'Ticker'),
    price: toNumber(findCol(row, 'Price')),
    pct: toNumber(findCol(row, 'Change')),
    vol,
    avgVolMAuto,
    floatMAuto: floatM,
  };
}

async function fetchFinvizGainers(apiKey){
  const url = `${FINVIZ_BASE}/export.ashx?v=152&f=${DEFAULT_FILTERS}&ft=4&c=${DEFAULT_COLUMNS}&auth=${apiKey}`;
  const r = await fetch(url);
  const text = await r.text();
  if(!r.ok || /<html/i.test(text)) throw new Error('Unexpected response from Finviz');
  return parseCsv(text).map(shapeRow).filter(row => row.ticker && row.price != null);
}

async function fetchFinnhubFreshness(ticker, apiKey){
  const to = new Date();
  const from = new Date(to.getTime() - 3 * 24 * 60 * 60 * 1000);
  const fmt = (d) => d.toISOString().slice(0, 10);
  const url = `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(ticker)}&from=${fmt(from)}&to=${fmt(to)}&token=${apiKey}`;
  try{
    const r = await fetch(url);
    const data = await r.json();
    if(!Array.isArray(data) || data.length === 0) return { hoursOld: null, headline: null };
    const latest = data.reduce((a, b) => (b && b.datetime > (a && a.datetime || 0) ? b : a), null);
    const hoursOld = latest && latest.datetime ? (Date.now() / 1000 - latest.datetime) / 3600 : null;
    return { hoursOld, headline: (latest && latest.headline) || null };
  }catch(e){
    return { hoursOld: null, headline: null };
  }
}

function todayStr(){ return new Date().toISOString().slice(0, 10); }

async function getFiredState(){
  const res = await fetch(`${SUPABASE_URL}/rest/v1/progress?key=eq.telegram-alerts-fired&select=state`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  const rows = await res.json();
  const state = Array.isArray(rows) && rows[0] && rows[0].state;
  if(!state || state.date !== todayStr()) return { date: todayStr(), fired: {} };
  return state;
}
async function saveFiredState(state){
  await fetch(`${SUPABASE_URL}/rest/v1/progress`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({ key: 'telegram-alerts-fired', state, updated_at: new Date().toISOString() }),
  });
}

async function sendTelegram(token, chatId, text){
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  if(!res.ok){
    const body = await res.text();
    throw new Error(`Telegram send failed: ${res.status} ${body}`);
  }
}

export default async function handler(req, res){
  const finvizKey = process.env.FINVIZ_API_KEY;
  const finhubKey = process.env.FINHUB_API_KEY;
  const tgToken = process.env.TELEGRAM_BOT_TOKEN;
  const tgChat = process.env.TELEGRAM_CHAT_ID;
  const missing = { finviz: !finvizKey, finhub: !finhubKey, telegramToken: !tgToken, telegramChat: !tgChat };
  if(Object.values(missing).some(Boolean)){
    res.status(200).json({ ok: false, reason: 'not configured', missing });
    return;
  }

  try{
    const gainers = await fetchFinvizGainers(finvizKey);
    // Sort by |change%| descending and only spend Finnhub calls checking
    // the top candidates — matches the Scanner tab's own "top 8" budget,
    // slightly wider here since this runs on a timer, not a click.
    const candidates = gainers.slice().sort((a, b) => Math.abs(b.pct||0) - Math.abs(a.pct||0)).slice(0, NEWS_CHECK_LIMIT);

    const fired = await getFiredState();
    const alertsToSend = [];

    for(const row of candidates){
      const freshness = await fetchFinnhubFreshness(row.ticker, finhubKey);
      const newsOk = freshness.hoursOld != null && freshness.hoursOld <= 24;
      const priceOk = row.price >= 1 && row.price <= 20;
      const gainOk = Math.abs(row.pct) >= 10;
      const relVol = (row.avgVolMAuto != null && row.avgVolMAuto > 0) ? (row.vol / (row.avgVolMAuto * 1e6)) : null;
      const volOk = relVol != null && relVol >= SCANNER_RELVOL_PILLAR_MIN;
      const floatOk = row.floatMAuto != null && row.floatMAuto < 20;
      const pillarCount = [priceOk, gainOk, volOk, newsOk, floatOk].filter(Boolean).length;

      const key = `pillars5:${row.ticker}`;
      if(pillarCount === 5 && !fired.fired[key]){
        fired.fired[key] = true;
        alertsToSend.push(`🎯 ${row.ticker} — 5/5 Pillars\n${row.pct>=0?'+':''}${row.pct.toFixed(2)}% at $${row.price.toFixed(2)}, rel vol ${relVol!=null?relVol.toFixed(1)+'x':'—'}, float ${row.floatMAuto!=null?row.floatMAuto.toFixed(1)+'M':'—'}`);
      }
      const freshKey = `freshnews:${row.ticker}`;
      if(freshness.hoursOld != null && freshness.hoursOld < 2 && !fired.fired[freshKey]){
        fired.fired[freshKey] = true;
        alertsToSend.push(`🔥 ${row.ticker} — fresh news (<2h)\n${row.pct>=0?'+':''}${row.pct.toFixed(2)}% at $${row.price.toFixed(2)}${freshness.headline ? `\n"${freshness.headline}"` : ''}`);
      }
    }

    for(const text of alertsToSend){
      await sendTelegram(tgToken, tgChat, text);
    }
    if(alertsToSend.length) await saveFiredState(fired);

    res.status(200).json({ ok: true, checked: candidates.length, alertsSent: alertsToSend.length });
  }catch(err){
    res.status(502).json({ ok: false, error: String(err && err.message || err) });
  }
}
