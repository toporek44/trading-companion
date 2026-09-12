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

import { SUPABASE_URL, SUPABASE_ANON_KEY, getPriceRange } from './_lib/supabase.js';

const FINVIZ_BASE = 'https://elite.finviz.com';
const DEFAULT_COLUMNS = '1,65,66,67,63,64,25,30,31';
const OTHER_FILTERS = 'ta_change_u10,sh_float_u20,sh_relvol_o2';
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

async function fetchFinvizGainers(apiKey, filters){
  const url = `${FINVIZ_BASE}/export.ashx?v=152&f=${filters}&ft=4&c=${DEFAULT_COLUMNS}&auth=${apiKey}`;
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
    if(!Array.isArray(data) || data.length === 0) return { hoursOld: null, headline: null, url: null };
    const latest = data.reduce((a, b) => (b && b.datetime > (a && a.datetime || 0) ? b : a), null);
    const hoursOld = latest && latest.datetime ? (Date.now() / 1000 - latest.datetime) / 3600 : null;
    return { hoursOld, headline: (latest && latest.headline) || null, url: (latest && latest.url) || null };
  }catch(e){
    return { hoursOld: null, headline: null, url: null };
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

async function sendTelegram(token, chatId, html){
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: html, parse_mode: 'HTML', disable_web_page_preview: false }),
  });
  if(!res.ok){
    const body = await res.text();
    throw new Error(`Telegram send failed: ${res.status} ${body}`);
  }
}

// Telegram's HTML parse_mode only needs these three characters escaped in
// dynamic text (tickers are always plain uppercase letters, safe as-is;
// headlines are freeform and can contain any of these).
function escapeHtml(s){
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const APP_URL = 'https://trading-companion-ashen.vercel.app';
function linksLine(ticker){
  return `<a href="https://finviz.com/quote.ashx?t=${ticker}">Finviz</a> · ` +
    `<a href="https://www.tradingview.com/symbols/${ticker}">TradingView</a> · ` +
    `<a href="${APP_URL}/#scanner">Scanner</a>`;
}

function formatPillarAlert(row, relVol){
  const pctStr = `${row.pct>=0?'+':''}${row.pct.toFixed(2)}%`;
  return [
    `🎯 <b>${row.ticker}</b> — 5/5 Pillars`,
    ``,
    `${pctStr} at $${row.price.toFixed(2)}`,
    `Rel Vol: ${relVol!=null?relVol.toFixed(1)+'x':'—'} · Float: ${row.floatMAuto!=null?row.floatMAuto.toFixed(1)+'M':'—'}`,
    ``,
    linksLine(row.ticker),
  ].join('\n');
}
function formatFreshNewsAlert(row, freshness){
  const pctStr = `${row.pct>=0?'+':''}${row.pct.toFixed(2)}%`;
  const lines = [
    `🔥 <b>${row.ticker}</b> — fresh news (&lt;2h)`,
    ``,
    `${pctStr} at $${row.price.toFixed(2)}`,
  ];
  if(freshness.headline){
    const headline = escapeHtml(freshness.headline);
    lines.push(``, freshness.url ? `<a href="${freshness.url}">${headline}</a>` : headline);
  }
  lines.push(``, linksLine(row.ticker));
  return lines.join('\n');
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

  // ?preview=1 sends one clearly-labeled sample message with realistic
  // fake data, using the exact same formatting/send path as a real alert —
  // for verifying Telegram rendering without waiting for a real qualifying
  // stock or touching Supabase dedup state. Safe to call any time.
  if(req.query && req.query.preview === '1'){
    const sampleRow = { ticker: 'AAPL', price: 5.42, pct: 18.7, floatMAuto: 6.3 };
    const sampleFreshness = { hoursOld: 0.4, headline: 'Sample Corp announces surprise Q3 earnings beat & raises guidance', url: 'https://finviz.com/quote.ashx?t=AAPL' };
    const previewText = `🧪 <b>Preview</b> — this is a sample, not a real alert\n\n` + formatPillarAlert(sampleRow, 8.2) + '\n\n———\n\n' + formatFreshNewsAlert(sampleRow, sampleFreshness);
    await sendTelegram(tgToken, tgChat, previewText);
    res.status(200).json({ ok: true, preview: true });
    return;
  }

  try{
    const priceRange = await getPriceRange();
    // Finviz's price filter is a single "NtoM" range token (whole dollars),
    // not separate "_oN"/"_uN" tokens — verified live against the real
    // export endpoint (see api/scanner-gainers.js for the full story).
    const filters = `sh_price_${Math.round(priceRange.min)}to${Math.round(priceRange.max)},${OTHER_FILTERS}`;
    const gainers = await fetchFinvizGainers(finvizKey, filters);
    // Sort by |change%| descending and only spend Finnhub calls checking
    // the top candidates — matches the Scanner tab's own "top 8" budget,
    // slightly wider here since this runs on a timer, not a click.
    const candidates = gainers.slice().sort((a, b) => Math.abs(b.pct||0) - Math.abs(a.pct||0)).slice(0, NEWS_CHECK_LIMIT);

    const fired = await getFiredState();
    const alertsToSend = [];

    for(const row of candidates){
      const freshness = await fetchFinnhubFreshness(row.ticker, finhubKey);
      const newsOk = freshness.hoursOld != null && freshness.hoursOld <= 24;
      const priceOk = row.price >= priceRange.min && row.price <= priceRange.max;
      const gainOk = Math.abs(row.pct) >= 10;
      const relVol = (row.avgVolMAuto != null && row.avgVolMAuto > 0) ? (row.vol / (row.avgVolMAuto * 1e6)) : null;
      const volOk = relVol != null && relVol >= SCANNER_RELVOL_PILLAR_MIN;
      const floatOk = row.floatMAuto != null && row.floatMAuto < 20;
      const pillarCount = [priceOk, gainOk, volOk, newsOk, floatOk].filter(Boolean).length;

      const key = `pillars5:${row.ticker}`;
      if(pillarCount === 5 && !fired.fired[key]){
        fired.fired[key] = true;
        alertsToSend.push(formatPillarAlert(row, relVol));
      }
      const freshKey = `freshnews:${row.ticker}`;
      if(freshness.hoursOld != null && freshness.hoursOld < 2 && !fired.fired[freshKey]){
        fired.fired[freshKey] = true;
        alertsToSend.push(formatFreshNewsAlert(row, freshness));
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
