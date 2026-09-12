import { state } from './state.js';

// ---------- Brief ----------
export function renderBrief(){
  const listEl = document.getElementById('brief-list');
  const dashEl = document.getElementById('dash-brief');
  if(state.briefs.length === 0){
    listEl.innerHTML = `<div class="empty-state">
      <div class="icon-wrap"><svg class="icon" viewBox="0 0 24 24"><rect x="3.5" y="4" width="17" height="16" rx="2"/><path d="M8 9h8M8 12.5h8M8 16h5"/></svg></div>
      <div>No brief has synced here yet. It arrives each morning once the scheduled task runs.</div></div>`;
    dashEl.innerHTML = `<p style="color:var(--muted);font-size:.9rem;margin:0;">No brief yet — check back after your scheduled morning run.</p>`;
    return;
  }
  listEl.innerHTML = state.briefs.map(b => `
    <div class="card" style="margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;">
        <strong class="mono" style="font-size:.85rem;color:var(--accent);">${b.date||b.id}</strong>
      </div>
      <div style="white-space:pre-wrap;font-size:.9rem;">${(b.text||'').replace(/</g,'&lt;')}</div>
    </div>`).join('');
  const latest = state.briefs[0];
  const snippet = (latest.text||'').slice(0,220);
  dashEl.innerHTML = `<div class="mono" style="font-size:.8rem;color:var(--accent);margin-bottom:6px;">${latest.date||latest.id}</div>
    <p style="margin:0 0 10px;font-size:.88rem;color:var(--muted);white-space:pre-wrap;">${snippet.replace(/</g,'&lt;')}${(latest.text||'').length>220?'…':''}</p>
    <button class="btn" onclick="document.querySelector('[data-page=brief]').click()">Read full brief</button>`;
}
