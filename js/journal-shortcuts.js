// Keyboard shortcuts for the Journal page, mirroring the Scanner's own
// shortcut file (js/scanner-shortcuts.js) — same guard pattern (only fires
// when this page is visible and focus isn't already in a form field), same
// "thin wrapper around existing buttons" approach rather than duplicating
// logic here.

const SHORTCUTS_HELP = [
  ['n', 'Focus the new-entry Instrument field'],
  ['/', 'Focus the trade log search box'],
  ['e', 'Export the trade log to CSV'],
  ['?', 'Show this shortcut list'],
];

function journalPageVisible(){
  const el = document.getElementById('page-journal');
  return el && !el.hidden;
}
function clickIfPresent(id){
  const el = document.getElementById(id);
  if(el) el.click();
}
function focusIfPresent(id){
  const el = document.getElementById(id);
  if(el){ el.scrollIntoView({behavior:'smooth', block:'center'}); el.focus(); }
}

document.addEventListener('keydown', (e) => {
  if(!journalPageVisible()) return;
  if(e.ctrlKey || e.metaKey || e.altKey) return;
  const tag = document.activeElement?.tagName;
  if(tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

  switch(e.key){
    case 'n':
    case 'N':
      focusIfPresent('f-instrument');
      break;
    case '/':
      focusIfPresent('trades-search');
      break;
    case 'e':
    case 'E':
      clickIfPresent('journal-export-csv');
      break;
    case '?':
      alert(SHORTCUTS_HELP.map(([k,d]) => `${k} — ${d}`).join('\n'));
      break;
    default:
      return; // don't preventDefault for keys we don't handle
  }
  e.preventDefault();
});
