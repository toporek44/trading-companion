// ---------- Nav / routing ----------
// Hash-based routing (#scanner, #journal, ...) so each tab is a real,
// bookmarkable/shareable URL and the browser's back/forward buttons work
// — no server-side rewrite needed since this is a pure static site.
export const pages = ['dashboard','calendar','journal','plan','scanner','lessons','milestones','brief'];
export const titles = {dashboard:'Dashboard', calendar:'Calendar', journal:'Trade Journal', plan:'Trading Plan', scanner:'Scanner', lessons:'Lessons', milestones:'Milestones', brief:'Daily Brief'};

function renderPage(name){
  pages.forEach(p => { document.getElementById('page-'+p).hidden = (p !== name); });
  document.querySelectorAll('#side-nav button').forEach(b => b.classList.toggle('active', b.dataset.page === name));
  document.getElementById('page-title').textContent = titles[name];
  window.scrollTo(0, 0);
}

// Same public signature as before (other modules call showPage('journal')
// etc. directly) — now also updates the URL hash so navigation is
// reflected there. Setting location.hash to its current value doesn't
// fire 'hashchange', so that case renders directly instead.
export function showPage(name){
  if(!pages.includes(name)) return;
  if(location.hash.slice(1) === name) renderPage(name);
  else location.hash = name;
}

window.addEventListener('hashchange', () => {
  const name = location.hash.slice(1);
  renderPage(pages.includes(name) ? name : 'dashboard');
});

document.getElementById('side-nav').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-page]');
  if(btn) showPage(btn.dataset.page);
});

document.getElementById('today-date').textContent = new Date().toLocaleDateString(undefined, {weekday:'short', year:'numeric', month:'short', day:'numeric'});

// Honor a deep link on first load (e.g. someone bookmarked #scanner);
// default to the dashboard otherwise.
renderPage(pages.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'dashboard');
