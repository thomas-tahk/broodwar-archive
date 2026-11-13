import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog } from '../tools/catalog/load.js';
import { bestGrade, isGap } from '../tools/catalog/grades.js';

const cat = loadCatalog('test/fixtures/catalog');
const match = (id) => cat.matches.find((m) => m.fullId === id);

test('loadCatalog returns plain arrays with fullId', () => {
  assert.equal(cat.events.length, 8);
  assert.equal(cat.players.length, 4);
  assert.equal(cat.maps.length, 3);
  assert.deepEqual(cat.matches.map((m) => m.fullId).sort(),
    ['fixture-cup/semi', 'fixture-future/undated', 'fixture-league/final', 'fixture-league/ro8-a-1', 'fixture-league/ro8-a-2', 'fixture-zeta/late', 'fixture-zeta/tbd']);
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

test('v2 loaders: series, items, featured and link lookups', async () => {
  process.env.CATALOG_DIR = 'test/fixtures/catalog';
  const lib = await import('../src/lib/catalog.js');
  assert.equal(lib.series.get('fixture-series').name, 'Fixture Series');
  assert.deepEqual(lib.eventsOfSeries('fixture-series').map((e) => e.id), ['fixture-big-2002', 'fixture-future', 'fixture-big-2001', 'fixture-cup', 'fixture-zeta', 'fixture-league']);
  assert.deepEqual(lib.itemsLinkingTo('player:alpha').map((i) => i.id), ['fixture-interview']);
  assert.deepEqual(lib.itemsLinkingTo('map:map-one').map((i) => i.id), ['fixture-interview']);
  assert.deepEqual(lib.itemsLinkingTo('player:bravo'), []);
  assert.deepEqual(lib.featured.map((f) => f.ref), ['event:fixture-league', 'series:fixture-series', 'item:fixture-interview']);
  assert.equal(lib.resolveRef('item:fixture-interview').type, 'item');
  assert.equal(lib.resolveRef('match:fixture-league/final').record.id, 'final');
  assert.equal(lib.resolveRef('player:nobody'), null);
});
