// ---------- Practice tab: unified daily spaced-repetition review ----------
import { state, persistProgress } from './state.js';
import { CANDLE_PATTERNS, renderCandleSVG, getCandleCards } from './candle-drill.js';
import { getGlossaryCards, CATEGORY_LABELS as GLOSSARY_CATEGORY_LABELS } from './glossary.js';
import { getStrategyCards, CATEGORY_LABELS as STRATEGY_CATEGORY_LABELS } from './strategy-cards.js';
import { todayStr, gradeCard, buildQueue, computeStreak } from './srs.js';

const CANDLE_CATEGORY_LABELS = { bullish: 'Bullish', bearish: 'Bearish', neutral: 'Neutral' };

function allCards(){
  return [...getCandleCards(), ...getGlossaryCards(), ...getStrategyCards()];
}

function deckLabel(deck){
  return deck === 'candle' ? 'Candles' : deck === 'glossary' ? 'Glossary' : 'Strategy';
}

function cardCategory(card){
  return card.deck === 'candle' ? card.cls : card.category;
}

function categoryLabelsFor(deck){
  return deck === 'candle' ? CANDLE_CATEGORY_LABELS : deck === 'glossary' ? GLOSSARY_CATEGORY_LABELS : STRATEGY_CATEGORY_LABELS;
}

// Category filter (per-browser only — a display preference, not synced SRS state).
let excludedCategories = new Set();
try { excludedCategories = new Set(JSON.parse(localStorage.getItem('tc-practice-category-filter') || '[]')); } catch(e){}

function activeCards(){
  return allCards().filter(c => !excludedCategories.has(cardCategory(c)));
}

function saveExcludedCategories(){
  try { localStorage.setItem('tc-practice-category-filter', JSON.stringify([...excludedCategories])); } catch(e){}
}

function toggleCategory(category){
  if(excludedCategories.has(category)) excludedCategories.delete(category);
  else excludedCategories.add(category);
  saveExcludedCategories();
  sessionQueue = null;
  renderPractice();
}

function renderCategoryFilters(){
  const decks = ['candle', 'glossary', 'strategy'];
  const groups = decks.map(deck => {
    const labels = categoryLabelsFor(deck);
    const categoriesPresent = [...new Set(allCards().filter(c => c.deck === deck).map(cardCategory))];
    const pills = categoriesPresent.map(cat => {
      const active = !excludedCategories.has(cat);
      const style = active
        ? 'border-color:var(--accent);background:var(--accent-soft);color:var(--accent);'
        : 'opacity:.5;';
      return `<button type="button" class="btn" style="display:inline-block;width:auto;margin:0 6px 6px 0;padding:3px 9px;font-size:.74rem;${style}" data-action="practice-toggle-category" data-category="${cat}">${labels[cat] || cat}</button>`;
    }).join('');
    return `<div style="margin-top:4px;"><span style="font-size:.72rem;color:var(--muted);margin-right:6px;">${deckLabel(deck)}:</span>${pills}</div>`;
  }).join('');
  return `<details style="margin-top:10px;"><summary style="cursor:pointer;font-size:.78rem;color:var(--muted);">Filter categories</summary>${groups}</details>`;
}

function shuffleArr(arr){
  const out = arr.slice();
  for(let i = out.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function pickDistractors(pool, excludeKey, keyFn, n){
  return shuffleArr(pool.filter(item => keyFn(item) !== excludeKey)).slice(0, n);
}

function buildPromptView(card){
  if(card.deck === 'candle'){
    const distractorNames = pickDistractors(CANDLE_PATTERNS, card.name, p => p.name, 3).map(p => p.name);
    return {
      promptHtml: `<div style="text-align:center;margin-bottom:10px;">${renderCandleSVG(card.candles)}</div>`,
      options: shuffleArr([card.name, ...distractorNames]),
      correctText: card.name,
      explainHtml: `${card.name} — ${card.cls}, ${card.type}-candle pattern.`,
    };
  }
  if(card.deck === 'glossary'){
    const pool = getGlossaryCards();
    const distractorDefs = pickDistractors(pool, card.term, c => c.term, 3).map(c => c.definition);
    return {
      promptHtml: `<div style="font-weight:600;font-size:1.05rem;">${card.term}</div>`,
      options: shuffleArr([card.definition, ...distractorDefs]),
      correctText: card.definition,
      explainHtml: card.definition,
    };
  }
  return {
    promptHtml: `<div style="font-weight:600;">${card.q}</div>`,
    options: card.options.slice(),
    correctText: card.options[card.correct],
    explainHtml: card.explain,
  };
}

let sessionQueue = null;
let sessionIndex = 0;
let sessionAnswered = null; // chosen option index, or null
let sessionView = null;

function newCardBudget(){
  const today = todayStr();
  const introducedToday = state.srsState.newCardsIntroducedDate === today ? (state.srsState.newCardsIntroducedToday || 0) : 0;
  return { today, introducedToday, budget: Math.max(0, 10 - introducedToday) };
}

function ensureSession(){
  if(sessionQueue) return;
  const { today, introducedToday, budget } = newCardBudget();
  const cards = activeCards();
  const alreadySeenIds = new Set(Object.keys(state.srsState.cards));
  sessionQueue = buildQueue(cards, state.srsState.cards, today, budget);
  const newlyIntroduced = sessionQueue.filter(c => !alreadySeenIds.has(c.id)).length;
  if(newlyIntroduced > 0){
    state.srsState = {
      ...state.srsState,
      newCardsIntroducedToday: introducedToday + newlyIntroduced,
      newCardsIntroducedDate: today,
    };
    persistProgress('srs', state.srsState);
  }
  sessionIndex = 0;
  sessionAnswered = null;
  sessionView = null;
}

function renderDeckBars(){
  const decks = ['candle', 'glossary', 'strategy'];
  return decks.map(deck => {
    const cards = activeCards().filter(c => c.deck === deck);
    const boxCounts = [0, 0, 0, 0, 0, 0, 0]; // index 0 = unseen, 1-6 = box
    cards.forEach(c => { const rec = state.srsState.cards[c.id]; boxCounts[rec ? rec.box : 0]++; });
    const segments = [1, 2, 3, 4, 5, 6].map(box => {
      const opacity = 0.3 + (box / 6) * 0.7;
      return `<div title="Box ${box}: ${boxCounts[box]}" style="flex:${boxCounts[box]};min-width:${boxCounts[box] ? '2px' : '0'};background:var(--good);opacity:${opacity};"></div>`;
    }).join('');
    return `<div style="margin-top:8px;">
      <div style="font-size:.78rem;color:var(--muted);margin-bottom:3px;">${deckLabel(deck)}: ${boxCounts[6]}/${cards.length} mastered</div>
      <div style="display:flex;height:8px;border-radius:100px;overflow:hidden;background:var(--surface-2);border:1px solid var(--line);">${segments}</div>
    </div>`;
  }).join('');
}

export function renderPractice(){
  ensureSession();
  const header = document.getElementById('practice-header');
  const body = document.getElementById('practice-body');
  if(!header || !body) return;

  const today = todayStr();
  const dueCount = activeCards().filter(c => state.srsState.cards[c.id] && state.srsState.cards[c.id].dueDate <= today).length;
  const { budget: newAvailable } = newCardBudget();
  header.innerHTML = `<div class="progress-label">Streak: ${state.srsState.streak || 0} day(s) &middot; ${dueCount} due today &middot; ${newAvailable} new available</div>${renderDeckBars()}${renderCategoryFilters()}`;

  if(sessionIndex >= sessionQueue.length){
    body.innerHTML = sessionQueue.length
      ? `<div class="empty-state">Session complete for today &mdash; nice work. <button class="btn primary" type="button" data-action="practice-restart" style="margin-top:10px;">Check for more</button></div>`
      : `<div class="empty-state">Nothing due right now. Come back tomorrow, or check for new cards.<div><button class="btn primary" type="button" data-action="practice-restart" style="margin-top:10px;">Check for more</button></div></div>`;
    return;
  }

  const card = sessionQueue[sessionIndex];
  if(!sessionView) sessionView = buildPromptView(card);
  const view = sessionView;

  const optionsHtml = view.options.map((opt, idx) => {
    let style = 'display:block;width:100%;text-align:left;margin-bottom:6px;';
    if(sessionAnswered !== null){
      if(opt === view.correctText) style += 'border-color:var(--good);background:var(--good-soft);color:var(--good);';
      else if(idx === sessionAnswered) style += 'border-color:var(--bad);background:var(--bad-soft);color:var(--bad);';
    }
    return `<button type="button" class="btn" style="${style}" data-opt-idx="${idx}" ${sessionAnswered !== null ? 'disabled' : ''}>${opt}</button>`;
  }).join('');

  const feedback = sessionAnswered !== null
    ? `<div style="margin-top:10px;">${view.options[sessionAnswered] === view.correctText ? '<span class="pill good">correct</span>' : '<span class="pill bad">incorrect</span>'}
        <p style="color:var(--muted);font-size:.83rem;margin:6px 0 0;">${view.explainHtml}</p></div>
       <div class="form-actions"><button class="btn primary" type="button" data-action="practice-next">Next</button></div>`
    : '';

  body.innerHTML = `<div style="font-size:.72rem;color:var(--muted);margin-bottom:8px;">${deckLabel(card.deck)} &middot; card ${sessionIndex + 1} / ${sessionQueue.length}</div>${view.promptHtml}${optionsHtml}${feedback}`;
}

function answerCurrent(idx){
  if(sessionAnswered !== null) return;
  const card = sessionQueue[sessionIndex];
  const view = sessionView;
  sessionAnswered = idx;
  const isCorrect = view.options[idx] === view.correctText;
  const today = todayStr();
  const newRecord = gradeCard(state.srsState.cards[card.id], isCorrect, today);
  const newStreak = computeStreak(state.srsState.streak || 0, state.srsState.lastReviewDate, today);
  state.srsState = {
    ...state.srsState,
    cards: { ...state.srsState.cards, [card.id]: newRecord },
    streak: newStreak,
    lastReviewDate: today,
  };
  persistProgress('srs', state.srsState);
  renderPractice();
}

function nextCard(){
  sessionIndex++;
  sessionAnswered = null;
  sessionView = null;
  renderPractice();
}

function restartSession(){
  sessionQueue = null;
  ensureSession();
  renderPractice();
}

document.getElementById('practice-body').addEventListener('click', (e) => {
  const optBtn = e.target.closest('button[data-opt-idx]');
  if(optBtn){ answerCurrent(parseInt(optBtn.dataset.optIdx, 10)); return; }
  const nextBtn = e.target.closest('button[data-action="practice-next"]');
  if(nextBtn){ nextCard(); return; }
  const restartBtn = e.target.closest('button[data-action="practice-restart"]');
  if(restartBtn){ restartSession(); }
});

document.getElementById('practice-header').addEventListener('click', (e) => {
  const catBtn = e.target.closest('button[data-action="practice-toggle-category"]');
  if(catBtn){ toggleCategory(catBtn.dataset.category); }
});
