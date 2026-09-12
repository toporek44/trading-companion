// ---------- Practice tab: unified daily spaced-repetition review ----------
import { state, persistProgress } from './state.js';
import { CANDLE_PATTERNS, renderCandleSVG, getCandleCards } from './candle-drill.js';
import { getGlossaryCards } from './glossary.js';
import { getStrategyCards } from './strategy-cards.js';
import { todayStr, gradeCard, buildQueue, computeStreak } from './srs.js';

function allCards(){
  return [...getCandleCards(), ...getGlossaryCards(), ...getStrategyCards()];
}

function deckLabel(deck){
  return deck === 'candle' ? 'Candles' : deck === 'glossary' ? 'Glossary' : 'Strategy';
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
      explainHtml: `${card.name} — this pattern is added to your Candles deck as you review it.`,
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

function ensureSession(){
  if(sessionQueue) return;
  sessionQueue = buildQueue(allCards(), state.srsState.cards, todayStr(), 10);
  sessionIndex = 0;
  sessionAnswered = null;
  sessionView = null;
}

function renderDeckBars(){
  const decks = ['candle', 'glossary', 'strategy'];
  return decks.map(deck => {
    const cards = allCards().filter(c => c.deck === deck);
    const mastered = cards.filter(c => (state.srsState.cards[c.id] || {}).box === 6).length;
    return `<div style="margin-top:4px;font-size:.78rem;color:var(--muted);">${deckLabel(deck)}: ${mastered}/${cards.length} mastered</div>`;
  }).join('');
}

export function renderPractice(){
  ensureSession();
  const header = document.getElementById('practice-header');
  const body = document.getElementById('practice-body');
  if(!header || !body) return;

  const today = todayStr();
  const dueCount = allCards().filter(c => state.srsState.cards[c.id] && state.srsState.cards[c.id].dueDate <= today).length;
  header.innerHTML = `<div class="progress-label">Streak: ${state.srsState.streak || 0} day(s) &middot; ${dueCount} due today</div>${renderDeckBars()}`;

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
