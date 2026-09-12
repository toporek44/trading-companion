// ---------- Fixed clock bar: Poland (Warsaw) time + US market status ----------
// Self-initializing (matches nav.js's pattern) — no exports needed since
// nothing else in the app reads this module's state.

// Returns a Date whose getHours()/getMinutes()/getDay() reflect `timeZone`'s
// wall-clock time. The resulting Date's own UTC instant is NOT `now` — this
// is only valid for reading local field getters and for diffing two values
// produced the same way, which is all this module does.
function zonedNow(timeZone){
  return new Date(new Date().toLocaleString('en-US', { timeZone }));
}

function formatHms(date){
  const p = (n) => String(n).padStart(2, '0');
  return `${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`;
}

function formatDuration(ms){
  const totalMin = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(totalMin / 60), m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// NYSE regular session, 9:30am-4:00pm ET, Mon-Fri. Does not account for
// market holidays (Thanksgiving, Christmas, etc.) or early-close days —
// a known simplification, not a full trading-calendar implementation.
function usMarketStatus(){
  const nowEt = zonedNow('America/New_York');
  const day = nowEt.getDay(); // 0 = Sun ... 6 = Sat
  const minutesNow = nowEt.getHours() * 60 + nowEt.getMinutes();
  const openMin = 9 * 60 + 30, closeMin = 16 * 60;
  const isWeekday = day >= 1 && day <= 5;

  if(isWeekday && minutesNow >= openMin && minutesNow < closeMin){
    const close = new Date(nowEt); close.setHours(16, 0, 0, 0);
    return { state: 'open', label: 'NYSE open', countdownLabel: 'closes in', ms: close - nowEt };
  }

  const beforeOpenToday = isWeekday && minutesNow < openMin;
  let next = new Date(nowEt);
  if(!beforeOpenToday) next.setDate(next.getDate() + 1);
  next.setHours(9, 30, 0, 0);
  while(next.getDay() === 0 || next.getDay() === 6) next.setDate(next.getDate() + 1);

  return {
    state: beforeOpenToday ? 'premarket' : 'closed',
    label: beforeOpenToday ? 'Pre-market' : 'NYSE closed',
    countdownLabel: 'opens in',
    ms: next - nowEt,
  };
}

function renderMarketClock(){
  const warsawEl = document.getElementById('mc-warsaw-time');
  const stateEl = document.getElementById('mc-us-state');
  const countdownEl = document.getElementById('mc-us-countdown');
  if(!warsawEl || !stateEl || !countdownEl) return;

  warsawEl.textContent = formatHms(zonedNow('Europe/Warsaw'));

  const status = usMarketStatus();
  stateEl.textContent = status.label;
  stateEl.className = `mc-us-state is-${status.state}`;
  countdownEl.textContent = `(${status.countdownLabel} ${formatDuration(status.ms)})`;
}

renderMarketClock();
setInterval(renderMarketClock, 1000);
