// ---------- Leitner spaced-repetition scheduler (pure, no DOM/state) ----------
export const BOX_INTERVALS = [0, 0, 1, 3, 7, 14, 30]; // index = box number, 1-6

export function todayStr(d = new Date()){
  return d.toISOString().slice(0, 10);
}

export function addDays(dateStr, days){
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function gradeCard(existing, correct, today){
  const prevBox = existing ? existing.box : 0;
  const newBox = correct ? Math.min(prevBox + 1, 6) : 1;
  return { box: newBox, dueDate: addDays(today, BOX_INTERVALS[newBox]), lastSeen: today };
}

export function shuffle(arr, rng = Math.random){
  const out = arr.slice();
  for(let i = out.length - 1; i > 0; i--){
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function buildQueue(cards, records, today, newCardLimit = 10, rng = Math.random){
  const due = cards.filter(c => records[c.id] && records[c.id].dueDate <= today);
  const unseen = cards.filter(c => !records[c.id]);
  const byDeck = {};
  unseen.forEach(c => { (byDeck[c.deck] = byDeck[c.deck] || []).push(c); });
  const deckKeys = Object.keys(byDeck);
  const introduced = [];
  let i = 0;
  while(introduced.length < newCardLimit && deckKeys.some(k => byDeck[k].length)){
    const key = deckKeys[i % deckKeys.length];
    if(byDeck[key].length) introduced.push(byDeck[key].shift());
    i++;
  }
  return shuffle(due.concat(introduced), rng);
}

export function computeStreak(prevStreak, lastReviewDate, today){
  if(lastReviewDate === today) return prevStreak;
  if(lastReviewDate === addDays(today, -1)) return prevStreak + 1;
  return 1;
}
