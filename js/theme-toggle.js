// Light/Dark/System theme toggle. styles.css already had a complete
// data-theme="dark" override (plus a :not([data-theme="light"]) guard on
// the prefers-color-scheme media query) sitting unused — no UI control had
// ever been wired up to actually set it. This just closes that gap.
// Self-initializing, matching market-clock.js's own pattern.
const THEME_KEY = 'tc-theme';
const ORDER = ['system', 'light', 'dark'];
const LABELS = { system: '\u{1F5A5}️ System', light: '☀️ Light', dark: '\u{1F319}️ Dark' };

function currentTheme(){
  const t = document.documentElement.dataset.theme;
  return (t === 'light' || t === 'dark') ? t : 'system';
}

function applyTheme(theme){
  if(theme === 'system'){
    delete document.documentElement.dataset.theme;
    try{ localStorage.removeItem(THEME_KEY); }catch(e){}
  } else {
    document.documentElement.dataset.theme = theme;
    try{ localStorage.setItem(THEME_KEY, theme); }catch(e){}
  }
  updateButton();
}

function updateButton(){
  const btn = document.getElementById('theme-toggle');
  if(!btn) return;
  const theme = currentTheme();
  btn.textContent = LABELS[theme];
  btn.title = `Theme: ${theme} (click to change)`;
}

document.getElementById('theme-toggle')?.addEventListener('click', () => {
  const idx = ORDER.indexOf(currentTheme());
  applyTheme(ORDER[(idx + 1) % ORDER.length]);
});

updateButton();
