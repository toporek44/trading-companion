import { state, persistProgress } from './state.js';

// ---------- Lessons ----------
export const LESSONS = [
  {
    id: 'pillars',
    title: 'The 5 Pillars',
    body: "Before you even think about buying, Warrior Trading's Small Account Toolkit asks a stock to clear five checks: it's already up at least 10% on the day (unless it's continuing a big move from a prior day), relative volume is at least 5x its average, there's a real news catalyst behind the move, price sits in the $1–$20 range (sweet spot $5–$10), and float is under 20 million shares (under 10 million is better). A stock that clears all five in your journal shows as a 5/5 pillars badge — that's your highest-quality setup, not just any green stock.",
    quiz: [
      { q: 'What relative volume does the Toolkit require?', options: ['At least 2x average', 'At least 5x average', 'At least 10x average', 'No specific number'], correct: 1, explain: "5x average volume is the Toolkit's own bar — anything less and the stock probably won't have the liquidity or attention to keep moving." },
      { q: 'What float does the Toolkit flag as ideal?', options: ['Under 50M shares', 'Under 20M shares (under 10M preferred)', 'Over 100M shares', "Float doesn't matter"], correct: 1, explain: 'Under 20M is the bar; under 10M is preferred — lower float means bigger % moves on the same dollar volume.' },
      { q: 'A stock is up 6% on the day with 3x relative volume, a strong news catalyst, priced at $8, float 15M. How many of the 5 pillars does it meet?', options: ['5/5', '4/5', '3/5', '2/5'], correct: 2, explain: "Price, news, and float clear the bar; the gain (6%) is below the 10% threshold and relative volume (3x) is below 5x — so it's 3 of 5, a decent watch, not an A+ setup." },
    ],
  },
  {
    id: 'worksheet',
    title: 'The Trading Plan Worksheet',
    body: "The worksheet turns vague good intentions into a checklist you fill out before the market opens: your strategy, price range, trading window, volume/float rules, technical setup, invalidation/exit, risk and profit target sizing, premarket requirements, and daily loss/profit limits. Warrior Trading's own worked example sizes risk at about 5% of account per trade and profit target at about 10% — a built-in 2:1 reward-to-risk built into the plan itself, before a single trade is placed.",
    quiz: [
      { q: 'In the worked example, roughly what fraction of the account is risked per trade?', options: ['1%', '5%', '10%', '25%'], correct: 1, explain: "The worksheet's own example: about 5% risk per trade against a ~10% profit target." },
      { q: 'What time window does the sample plan use?', options: ['24 hours, any time', '7:00am–11:00am EST', 'After 4pm EST only', 'Weekends only'], correct: 1, explain: 'The sample plan trades the morning momentum window, 7:00am to 11:00am EST.' },
      { q: 'Why fill out a written plan before the session instead of deciding in the moment?', options: ['It is required by brokers', 'It removes decisions that are easy to get wrong once emotions and P&L are live', 'It guarantees profits', 'It replaces the need for a stop-loss'], correct: 1, explain: 'A plan written calmly beforehand is a lot more reliable than a decision made mid-trade under pressure.' },
    ],
  },
  {
    id: 'patterns',
    title: 'Entry patterns',
    body: 'Three entry patterns run through this whole system: Pullback (buy the first green candle that makes a new high after a dip), Bull Flag Breakout (buy the first candle making a new high after a flag/pullback), and Flat Top Breakout (buy the first candle that breaks a flat resistance top). All three share the same idea — wait for the market to show you it wants to keep going, then get in on strength, not in anticipation of it.',
    quiz: [
      { q: 'What do a Bull Flag Breakout and a Flat Top Breakout have in common?', options: ['Both are only used for options', 'Both wait for a new high to actually be made before entering', 'Both require a red candle to trigger entry', 'Both ignore volume completely'], correct: 1, explain: "Both patterns enter on confirmation — a new high being made — rather than anticipating one." },
      { q: 'Where does the Pullback pattern place a stop, typically?', options: ['At the high of day', 'At the low of the pullback', "At yesterday's close", 'There is no stop'], correct: 1, explain: 'The low of the pullback is the level that, if broken, invalidates the setup.' },
      { q: 'A stock is coiling below a clear resistance level. Which pattern are you watching for a break of?', options: ['Flat Top Breakout', 'Cash-secured put', 'Iron condor', 'MACD crossover'], correct: 0, explain: 'A flat resistance top breaking is exactly the Flat Top Breakout setup.' },
    ],
  },
  {
    id: 'rmultiples',
    title: 'Risk math: R-multiples',
    body: "An R-multiple measures a trade's result relative to what you risked: risk $50 and make $100, that's +2R; risk $50 and lose $50, that's -1R. This matters because win rate alone can be misleading — a trader who wins 3 out of 10 trades can still be solidly profitable if winners average +2R and losers average -1R. That's the whole logic behind trading a 2:1 (or better) reward-to-risk ratio.",
    quiz: [
      { q: 'You risk $40 and the trade nets +$120. What is the R-multiple?', options: ['+1R', '+2R', '+3R', '+4R'], correct: 2, explain: '$120 / $40 = 3, so +3R.' },
      { q: 'Why can a trader with a 40% win rate still be profitable?', options: ['They cannot — under 50% always loses money', 'If winners are large enough relative to losers (a good R:R), fewer wins still add up to a net gain', 'Win rate never matters', 'It is only possible in options'], correct: 1, explain: 'A strong reward-to-risk ratio can more than offset a win rate under 50%.' },
      { q: "Rule 3 in the Small Account Toolkit's worked example says what happens after three consecutive losers?", options: ['Double your position size', 'Switch strategies mid-day', 'The trading day ends', 'Nothing — keep trading as normal'], correct: 2, explain: 'Three consecutive losing trades ends the trading day, per the Toolkit.' },
    ],
  },
  {
    id: 'breakeven',
    title: 'The breakeven win-rate table',
    body: "Every reward:risk ratio has a breakeven win rate — the minimum win % needed to not lose money over time. At 1:1 you need 50% just to break even. At 2:1 (risk $1 to make $2) you only need 33%. At 3:1 you need just 25%. The table in your Plan tab has this fully worked out from 50:1 down to 1:50 — the point isn't to memorize it, it's to check your own numbers against it honestly.",
    quiz: [
      { q: 'At a 2:1 reward:risk ratio, what win rate do you need to break even?', options: ['25%', '33%', '50%', '67%'], correct: 1, explain: '2:1 needs about 33% to break even — see the Plan tab table.' },
      { q: 'At a 1:2 reward:risk ratio (risking twice what you are targeting), what win rate is needed to break even?', options: ['17%', '33%', '50%', '67%'], correct: 3, explain: 'A worse ratio needs a much higher win rate — 1:2 needs about 67%.' },
      { q: 'Why does a trader chasing a very high reward:risk ratio (say 10:1) not need a high win rate?', options: ['Because a single big winner covers many small, defined losses', 'Because 10:1 trades are guaranteed to win', 'Because position sizing does not matter at 10:1', 'It is a myth — 10:1 needs the same win rate as 1:1'], correct: 0, explain: 'At 10:1, breakeven win rate drops to about 9% — one big winner can cover many small losses.' },
    ],
  },
  {
    id: 'trifecta',
    title: 'The Profit Trifecta',
    body: "The Profit Trifecta tracks three things together — consistency (how many weeks in a row you're net green), accuracy (win rate), and P/L ratio (average winner vs average loser) — because chasing any one alone is a trap. Warrior Trading's own tiers: Novice needs just 1 green week, 40–50% accuracy, and a 0.5–1 P/L ratio; by Pro you're looking at 5+ green weeks, over 70% accuracy, and a P/L ratio over 1.0.",
    quiz: [
      { q: 'What three things does the Profit Trifecta track together?', options: ['Consistency, accuracy, P/L ratio', 'Just win rate', 'Account size and leverage', 'Number of trades per day'], correct: 0, explain: 'All three together — chasing just one in isolation is the trap.' },
      { q: 'At the Novice tier, what accuracy range is expected?', options: ['70%+', '60-70%', '50-60%', '40-50%'], correct: 3, explain: 'Novice: 40-50% accuracy, per the exact tier table.' },
      { q: 'Why track consistency (green weeks in a row) alongside accuracy and P/L ratio?', options: ['It does not matter, only P&L matters', 'One lucky week can hide an unstable process — consistency shows it is repeatable', 'Consistency is only relevant to options traders', 'It is a vanity metric'], correct: 1, explain: 'Consistency is the check that a good result is a repeatable process, not a lucky week.' },
    ],
  },
  {
    id: 'macdvolume',
    title: 'The MACD + volume filter',
    body: "Two things have to say yes before you take a pattern entry: MACD must be positive and not rolling over, and volume must confirm — meaning the green (up) candles are trading on higher volume than the red (down) candles around them. If either one says no, skip the trade, even if the chart pattern looks perfect. A stock can look like a textbook pullback and still fail if the volume underneath it shows more selling than buying, or if MACD has already turned down. Both signals agreeing doesn't guarantee a winner, but it meaningfully raises the odds — and needing only about a 33% win rate at 2:1 reward:risk means you don't need every trade to work, just most of the ones where both signals agree.",
    quiz: [
      { q: "A stock's chart shows a clean pullback and MACD is positive, but the pullback candles are on unusually high volume. What should you do?", options: ['Buy anyway — MACD is positive', 'Skip it — high-volume selling on the pullback is a warning sign even with MACD positive', 'Buy double size since volume is high', 'Ignore volume, it never matters'], correct: 1, explain: 'Both signals have to agree. High-volume selling on the pullback says sellers are in control, even though MACD hasn’t rolled over yet.' },
      { q: 'MACD is negative and volume looks fine. Do you take the trade?', options: ['Yes, volume is what matters most', 'No — one indicator saying no is enough to skip the trade', 'Only if the stock is up more than 50%', 'Yes, but with a wider stop'], correct: 1, explain: 'One no is enough. Both MACD and volume have to agree before entry.' },
      { q: 'Why is it useful that this system only needs roughly a 33% win rate to be profitable (at 2:1 reward:risk)?', options: ['It means every setup will work', 'It means you can afford to skip marginal setups where MACD or volume disagree, and still be profitable trading only the clean ones', 'Win rate doesn’t matter at all', 'It means position size doesn’t matter'], correct: 1, explain: 'Because the breakeven bar is low, you can afford to be selective — pass on anything where MACD and volume don’t both agree, and still come out ahead.' },
    ],
  },
  {
    id: 'scanner',
    title: 'Reading the Scanner: catalyst quality & news freshness',
    body: "The Scanner tab checks price and % gain automatically from Alpha Vantage, but relative volume needs an average-volume baseline you enter once per ticker, and news freshness needs a click — hit \"Check news\" to pull a ticker's latest headline and see it rendered as an age icon (🔥 under 2h, 🟢 under 4h, 🟡 under 12h, 🟠 under 24h, ⚪ 24h+). A catalyst's type matters as much as its freshness: earnings, FDA approvals, clinical trial results, and major contracts all count toward the News pillar — but a merger, buyout, or acquisition catalyst is flagged and deliberately excluded, because once a buyout price is set, the stock's upside is capped and it tends to go flat.",
    quiz: [
      { q: 'Which of these does the Scanner check automatically from Alpha Vantage, with no manual entry needed?', options: ['Relative volume', 'Float', 'Price and % change', 'News freshness'], correct: 2, explain: 'Price and % change come straight from the API; relative volume, float, and news freshness all need at least one manual step.' },
      { q: "Why does a merger/buyout catalyst NOT count toward the News pillar, even though it's real news?", options: ['Because mergers are rare', "Because once a buyout price is set, the stock's value is fixed and volatility dries up", "Because Alpha Vantage can't detect mergers", 'It does count — all news counts equally'], correct: 1, explain: "A fixed buyout price caps the stock's movement, removing exactly the volatility a momentum trade needs." },
      { q: 'What does the 🔥 news-freshness icon mean?', options: ['The stock is up more than 50% today', 'The latest headline was published under 2 hours ago', 'The stock has 5x+ relative volume', 'The float is under 1 million shares'], correct: 1, explain: '🔥 is the freshest tier — under 2 hours old — the icons scale down in freshness from there (🟢 <4h, 🟡 <12h, 🟠 <24h, ⚪ 24h+).' },
    ],
  },
  {
    id: 'process',
    title: 'Process over P&L',
    body: "A trade can be a technical 'A+' setup that still loses money, and a sloppy trade can still make money by luck — that's exactly why the journal tracks 'process followed' separately from the dollar result. Grading yourself on whether you followed your own rules, not just whether you made money, is what actually compounds skill over time; P&L on any single trade is mostly noise.",
    quiz: [
      { q: "Why track 'process followed' as its own field, separate from P&L?", options: ['It is required by brokers', 'A good process can still lose on any single trade, and a bad process can still win by luck — P&L alone does not show which happened', 'It is the same thing as P&L', 'It does not matter'], correct: 1, explain: 'Process and outcome are different things — a single trade cannot tell you which one happened.' },
      { q: 'Over many trades, what should matter more for judging your trading?', options: ["Any single trade's result", 'Consistent process adherence and expectancy across a sample', 'Your best single day', "Your broker's account balance chart"], correct: 1, explain: 'A large enough sample is what actually reveals whether your process works.' },
    ],
  },
  {
    id: 'alphabeta',
    title: 'Alpha → Beta → Live',
    body: 'Before real money, this system asks for two proving grounds. Alpha is high-volume simulator reps — no real-money pressure, just building pattern recognition and mechanical execution. Beta is trading small real size, but capped to one truly A+ setup a day for 10 straight trading days, and the whole stretch has to net green to graduate. Only after that does Live start — and even then, expect the very first live trade to lose; the point of Beta was proving the process works over a sample, not that any one trade wins.',
    quiz: [
      { q: 'What is the goal of the Alpha stage?', options: ['Make as much money as possible', 'Build pattern recognition and mechanical execution with no real-money pressure', 'Trade full size immediately', 'Skip straight to live trading'], correct: 1, explain: 'Alpha is purely about building skill in the simulator, no real-money pressure.' },
      { q: 'What does the Beta stage require to graduate?', options: ['A single winning trade', '10 straight trading days, one A+ setup/day, the whole stretch nets green', 'One month of any trading', 'Passing a written exam only'], correct: 1, explain: 'Ten straight days, one A+ setup a day, net green across the whole stretch.' },
      { q: 'What should a trader expect from their very first live trade?', options: ['A guaranteed win', 'It might well lose — that is expected, not a sign anything is wrong', 'It should be their biggest size ever', 'To skip it and start on trade two'], correct: 1, explain: 'A losing first live trade is expected — Beta proved the process, not that any one trade wins.' },
    ],
  },
  {
    id: 'chartpatterns',
    title: 'Chart pattern catalog',
    body: "Beyond the Pullback, Bull Flag, and Flat Top setups you already know, a few more chart patterns come up constantly: a Flat Bottom Breakdown (the bearish mirror of a Flat Top — sell/short the first candle that breaks a flat support floor), an ABCD pattern (price swings from A down to B, retraces up to C, then pushes to a new extreme at D — the C-to-D leg is the tradeable move), a Double Top (two peaks near the same round-dollar price, often only breaking through on a third attempt), Head and Shoulders (a peak, a higher peak, then a lower peak — a classic reversal), and two traps worth knowing by name: a Bull Trap (a breakout that looks real but quickly reverses, trapping buyers who bought the false move) and a Bear Trap (the same idea to the downside). One more reversal signal: after 5+ consecutive candles moving one direction, the first candle to make a new high (or low) against that run is a classic exhaustion/reversal signal.",
    quiz: [
      { q: 'In a Flat Top Breakout, when do you buy?', options: ['The first candle that breaks above the flat resistance top', 'At the very bottom of the flag', 'On the first red candle', 'Only after 3 closes below support'], correct: 0, explain: 'You buy confirmation of the break, not in anticipation of it.' },
      { q: 'A stock forms two peaks near the same round-dollar price and only breaks through on a third attempt. What is this pattern called?', options: ['Double Top', 'Head and Shoulders', 'ABCD Flag', 'Bear Trap'], correct: 0, explain: 'Two peaks at the same level, broken on the third try, is the classic Double Top setup.' },
      { q: "What is a 'Bull Trap'?", options: ['A breakout that looks real but quickly reverses, trapping buyers who bought the false move', 'A guaranteed winning setup', 'Another name for a Bull Flag', 'A pattern that only happens after hours'], correct: 0, explain: 'The breakout fails almost immediately, leaving late buyers stuck.' },
      { q: 'In the ABCD pattern, what does the C-to-D leg represent?', options: ['A new leg up, pushing from point C toward a new extreme at point D', 'The initial move down before any pattern begins', 'A random consolidation with no trading significance', 'The point where you must exit for a loss'], correct: 0, explain: 'C to D is the leg that actually gets traded, after A-to-B sets up the swing.' },
      { q: 'After 5+ consecutive candles moving in one direction, what is the classic reversal signal?', options: ['The first candle to make a new high (or low) against that run', 'Another candle in the same direction', 'A gap in the same direction', 'Doubling your position size'], correct: 0, explain: 'The first candle to break the run is read as early exhaustion of that move.' },
    ],
  },
];

// In-progress (unsaved) quiz answers per lesson: lessonId -> array of chosen option indices.
let lessonAnswers = {};
// Whether the current in-progress attempt for a lesson has been submitted (shows feedback).
let lessonSubmitted = {};

export function lessonPassThreshold(total){
  // 2-question quiz needs 2/2, 3-question quiz needs 2/3 (fixed 67%+ threshold, rounded).
  return Math.ceil(total * 2 / 3);
}

export function selectLessonAnswer(lessonId, qIdx, optIdx){
  if(!lessonAnswers[lessonId]) lessonAnswers[lessonId] = [];
  lessonAnswers[lessonId][qIdx] = optIdx;
  lessonSubmitted[lessonId] = false;
  renderLessons();
}

export function submitLessonQuiz(lessonId){
  const lesson = LESSONS.find(l => l.id === lessonId);
  if(!lesson) return;
  const answers = lessonAnswers[lessonId] || [];
  let correctCount = 0;
  lesson.quiz.forEach((q, qi) => { if(answers[qi] === q.correct) correctCount++; });
  const needed = lessonPassThreshold(lesson.quiz.length);
  const passed = correctCount >= needed;
  const prev = state.lessonsState[lessonId] || {};
  const newState = {
    ...state.lessonsState,
    [lessonId]: {
      passed,
      bestScore: Math.max(prev.bestScore || 0, correctCount),
      lastAnswers: answers.slice(),
    },
  };
  lessonSubmitted[lessonId] = true;
  state.lessonsState = newState;
  persistProgress('lessons', newState);
  renderLessons();
}

export function renderLessonCard(lesson){
  const s = state.lessonsState[lesson.id] || {};
  if(!lessonAnswers[lesson.id]) lessonAnswers[lesson.id] = s.lastAnswers ? s.lastAnswers.slice() : [];
  if(lessonSubmitted[lesson.id] == null) lessonSubmitted[lesson.id] = !!s.lastAnswers;
  const answers = lessonAnswers[lesson.id];
  const submitted = lessonSubmitted[lesson.id];
  let correctCount = 0;
  if(submitted) lesson.quiz.forEach((q, qi) => { if(answers[qi] === q.correct) correctCount++; });

  const questionsHtml = lesson.quiz.map((q, qi) => {
    const optionsHtml = q.options.map((opt, oi) => {
      const isSelected = answers[qi] === oi;
      let style = 'display:block;width:100%;text-align:left;margin-bottom:6px;';
      if(submitted){
        if(oi === q.correct) style += 'border-color:var(--good);background:var(--good-soft);color:var(--good);';
        else if(isSelected) style += 'border-color:var(--bad);background:var(--bad-soft);color:var(--bad);';
      } else if(isSelected){
        style += 'border-color:var(--accent);background:var(--accent-soft);color:var(--accent);';
      }
      return `<button type="button" class="btn" style="${style}" data-lesson="${lesson.id}" data-qidx="${qi}" data-oidx="${oi}">${opt}</button>`;
    }).join('');
    const feedback = submitted
      ? `<div style="margin-top:4px;">${answers[qi] === q.correct ? '<span class="pill good">correct</span>' : '<span class="pill bad">incorrect</span>'}
          <p style="color:var(--muted);font-size:.83rem;margin:6px 0 0;">${q.explain}</p></div>`
      : '';
    return `<div style="margin-top:14px;">
        <div style="font-size:.86rem;font-weight:600;margin-bottom:8px;">${qi+1}. ${q.q}</div>
        ${optionsHtml}
        ${feedback}
      </div>`;
  }).join('');

  const summaryHtml = submitted
    ? `<div style="margin-top:14px;">${correctCount >= lessonPassThreshold(lesson.quiz.length) ? '<span class="pill good">' : '<span class="pill bad">'}You got ${correctCount} / ${lesson.quiz.length} correct</span></div>`
    : '';

  return `<div class="card" style="margin-bottom:20px;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
        <h3 style="margin-bottom:0;">${lesson.title}</h3>
        ${s.passed ? '<span class="pill good">passed</span>' : ''}
      </div>
      <p style="color:var(--muted);font-size:.86rem;margin:10px 0 0;">${lesson.body}</p>
      ${questionsHtml}
      <div class="form-actions"><button class="btn primary" type="button" data-action="submit-quiz" data-lesson="${lesson.id}">Check answers</button></div>
      ${summaryHtml}
    </div>`;
}

export function renderLessons(){
  const root = document.getElementById('lessons-list');
  if(!root) return;
  root.innerHTML = LESSONS.map(lesson => renderLessonCard(lesson)).join('');
  const passedCount = LESSONS.filter(l => (state.lessonsState[l.id]||{}).passed).length;
  document.getElementById('lessons-progress-label').textContent = `${passedCount} / ${LESSONS.length} lessons passed`;
  document.getElementById('lessons-progress-fill').style.width = (passedCount/LESSONS.length*100)+'%';
}
document.getElementById('lessons-list').addEventListener('click', (e) => {
  const optBtn = e.target.closest('button[data-lesson][data-oidx]');
  if(optBtn){ selectLessonAnswer(optBtn.dataset.lesson, parseInt(optBtn.dataset.qidx,10), parseInt(optBtn.dataset.oidx,10)); return; }
  const submitBtn = e.target.closest('button[data-action="submit-quiz"]');
  if(submitBtn){ submitLessonQuiz(submitBtn.dataset.lesson); }
});
