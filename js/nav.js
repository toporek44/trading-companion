// ---------- Nav ----------
export const pages = ['dashboard','calendar','journal','plan','scanner','lessons','milestones','brief'];
export const titles = {dashboard:'Dashboard', calendar:'Calendar', journal:'Trade Journal', plan:'Trading Plan', scanner:'Scanner', lessons:'Lessons', milestones:'Milestones', brief:'Daily Brief'};
export function showPage(name){
  pages.forEach(p => { document.getElementById('page-'+p).hidden = (p !== name); });
  document.querySelectorAll('#side-nav button').forEach(b => b.classList.toggle('active', b.dataset.page === name));
  document.getElementById('page-title').textContent = titles[name];
}
document.getElementById('side-nav').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-page]');
  if(btn) showPage(btn.dataset.page);
});
document.getElementById('today-date').textContent = new Date().toLocaleDateString(undefined, {weekday:'short', year:'numeric', month:'short', day:'numeric'});
