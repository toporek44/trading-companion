import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, gradeCard, buildQueue, computeStreak, BOX_INTERVALS } from '../js/srs.js';

test('addDays adds calendar days across a month boundary', () => {
  assert.equal(addDays('2026-01-30', 3), '2026-02-02');
});

test('gradeCard promotes box on a correct answer', () => {
  const result = gradeCard({ box: 2, dueDate: '2026-01-01', lastSeen: '2026-01-01' }, true, '2026-01-05');
  assert.equal(result.box, 3);
  assert.equal(result.dueDate, addDays('2026-01-05', BOX_INTERVALS[3]));
  assert.equal(result.lastSeen, '2026-01-05');
});

test('gradeCard resets to box 1 on a wrong answer', () => {
  const result = gradeCard({ box: 5, dueDate: '2026-01-01', lastSeen: '2026-01-01' }, false, '2026-01-05');
  assert.equal(result.box, 1);
  assert.equal(result.dueDate, addDays('2026-01-05', BOX_INTERVALS[1]));
});

test('gradeCard introduces an unseen card at box 1 either way', () => {
  assert.equal(gradeCard(null, true, '2026-01-05').box, 1);
  assert.equal(gradeCard(undefined, false, '2026-01-05').box, 1);
});

test('gradeCard caps box at 6', () => {
  const result = gradeCard({ box: 6, dueDate: '2026-01-01', lastSeen: '2026-01-01' }, true, '2026-01-05');
  assert.equal(result.box, 6);
});

test('buildQueue includes due cards and caps new cards at the limit, round-robin across decks', () => {
  const cards = [
    { id: 'a1', deck: 'a' }, { id: 'a2', deck: 'a' }, { id: 'a3', deck: 'a' },
    { id: 'b1', deck: 'b' }, { id: 'b2', deck: 'b' },
  ];
  const records = { a1: { box: 2, dueDate: '2026-01-01' } };
  const queue = buildQueue(cards, records, '2026-01-05', 3, () => 0.999);
  const ids = queue.map(c => c.id);
  assert.equal(queue.length, 4);
  assert.ok(ids.includes('a1'));
  assert.ok(ids.includes('a2'));
  assert.ok(ids.includes('b1'));
});

test('buildQueue excludes cards not yet due', () => {
  const cards = [{ id: 'a1', deck: 'a' }];
  const records = { a1: { box: 2, dueDate: '2099-01-01' } };
  const queue = buildQueue(cards, records, '2026-01-05', 0, () => 0.5);
  assert.equal(queue.length, 0);
});

test('computeStreak increments on a consecutive day, resets on a gap, holds on the same day', () => {
  assert.equal(computeStreak(5, '2026-01-04', '2026-01-05'), 6);
  assert.equal(computeStreak(5, '2026-01-05', '2026-01-05'), 5);
  assert.equal(computeStreak(5, '2026-01-01', '2026-01-05'), 1);
  assert.equal(computeStreak(0, null, '2026-01-05'), 1);
});
