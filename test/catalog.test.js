import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog } from '../tools/catalog/load.js';
import { bestGrade, isGap } from '../tools/catalog/grades.js';

const cat = loadCatalog('test/fixtures/catalog');
const match = (id) => cat.matches.find((m) => m.fullId === id);

test('loadCatalog returns plain arrays with fullId', () => {
  assert.equal(cat.events.length, 1);
  assert.equal(cat.players.length, 3);
  assert.equal(cat.maps.length, 2);
  assert.deepEqual(cat.matches.map((m) => m.fullId).sort(),
    ['fixture-league/final', 'fixture-league/ro8-a-1', 'fixture-league/ro8-a-2']);
});

test('final: D, X, ungraded copy -> null; all gaps', () => {
  const games = match('fixture-league/final').games;
  assert.deepEqual(games.map(bestGrade), ['D', 'X', null]);
  assert.deepEqual(games.map(isGap), [true, true, true]);
});

test('no copies -> null and gap', () => {
  const g = match('fixture-league/ro8-a-2').games[0];
  assert.equal(bestGrade(g), null);
  assert.equal(isGap(g), true);
});

test('best of several copies; A-C is not a gap', () => {
  const copy = (grade) => ({ grade });
  assert.equal(bestGrade({ lost: false, copies: [copy('C'), copy('B'), copy(null)] }), 'B');
  assert.equal(isGap({ lost: false, copies: [copy('D'), copy('C')] }), false);
  assert.equal(isGap({ lost: false, copies: [copy('D')] }), true);
});

test('lost wins over copies', () => {
  assert.equal(bestGrade({ lost: true, copies: [{ grade: 'A' }] }), 'X');
});

test('ro8-a-1 gap status follows its best grade', () => {
  for (const g of match('fixture-league/ro8-a-1').games) {
    assert.equal(isGap(g), !['A', 'B', 'C'].includes(bestGrade(g)));
  }
});
