import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSearch, normalize, fromParams, toParams } from '../src/lib/search.js';
import { buildRecords } from '../tools/search/records.js';
import { loadCatalog } from '../tools/catalog/load.js';

// Fictional records. Fields mirror buildRecords output.
const rec = (o) => ({ kind: 'game', players: [], names: [], title: '', eventName: null, mapName: null, year: null, tier: null, league: null, matchup: null, map: null, grade: 'none', ...o });
const RECORDS = [
  rec({ id: 'g1', title: 'Alpha vs Bravo', names: ['Alpha', 'Bravo'], players: ['alpha', 'bravo'], eventName: '2001 SKY OSL', year: 2001, tier: 'big', league: 'osl', matchup: 'PT', map: 'm1', mapName: 'Neo Vertigo', grade: 'B' }),
  rec({ id: 'g2', title: 'Alpha vs Charlie', names: ['Alpha', 'Charlie'], players: ['alpha', 'charlie'], eventName: '2001 SKY OSL', year: 2001, tier: 'big', league: 'osl', matchup: 'TZ', map: 'm2', mapName: 'Incubus', grade: 'X' }),
  rec({ id: 'g3', title: 'Bravo vs Charlie', names: ['Bravo', 'Charlie'], players: ['bravo', 'charlie'], eventName: '2002 MSL', year: 2002, tier: 'mid', league: 'msl', matchup: 'PT', map: 'm1', mapName: 'Neo Vertigo', grade: 'A' }),
  rec({ id: 'g4', title: 'Zoë vs Delta', names: ['Zoë', 'Delta'], players: ['zoe', 'delta'], eventName: '2002 MSL', year: 2002, tier: 'mid', league: 'msl', matchup: null, grade: 'none' }),
  rec({ id: 'i1', kind: 'interview', title: 'Alpha interview', names: ['Alpha'], players: ['alpha'], year: 2001, league: 'osl', tier: 'big', grade: null }),
];
const search = createSearch(RECORDS);
const ids = (r) => r.results.map((x) => x.id);

test('empty query and selection returns everything', () => {
  const r = search('', {});
  assert.deepEqual(ids(r), ['g1', 'g2', 'g3', 'g4', 'i1']);
  assert.equal(r.counts.total, 5);
});

test('text matches player, event, map, item title; case and diacritics insensitive', () => {
  assert.deepEqual(ids(search('BRAVO')), ['g1', 'g3']);
  assert.deepEqual(ids(search('msl')), ['g3', 'g4']);
  assert.deepEqual(ids(search('incubus')), ['g2']);
  assert.deepEqual(ids(search('interview')), ['i1']);
  assert.deepEqual(ids(search('zoe')), ['g4']);
  assert.deepEqual(ids(search('ZOË')), ['g4']);
  assert.equal(normalize('Éé Zoë'), 'ee zoe');
});

test('every word must match; no match gives empty results, not an error', () => {
  assert.deepEqual(ids(search('alpha osl')), ['g1', 'g2']);
  assert.deepEqual(ids(search('alpha msl')), []);
  assert.equal(search('nope').counts.total, 0);
});

test('each filter on its own', () => {
  assert.deepEqual(ids(search('', { kind: ['interview'] })), ['i1']);
  assert.deepEqual(ids(search('', { kind: ['game'] })), ['g1', 'g2', 'g3', 'g4']);
  assert.deepEqual(ids(search('', { year: [2002] })), ['g3', 'g4']);
  assert.deepEqual(ids(search('', { tier: ['mid'] })), ['g3', 'g4']);
  assert.deepEqual(ids(search('', { league: ['osl'] })), ['g1', 'g2', 'i1']);
  assert.deepEqual(ids(search('', { player: ['charlie'] })), ['g2', 'g3']);
  assert.deepEqual(ids(search('', { matchup: ['PT'] })), ['g1', 'g3']);
  assert.deepEqual(ids(search('', { map: ['m1'] })), ['g1', 'g3']);
  assert.deepEqual(ids(search('', { grade: ['X'] })), ['g2']);
  assert.deepEqual(ids(search('', { grade: ['none'] })), ['g4']);
});

test('values inside one facet are OR, across facets AND, with text on top', () => {
  assert.deepEqual(ids(search('', { year: [2001, 2002] })), ['g1', 'g2', 'g3', 'g4', 'i1']);
  assert.deepEqual(ids(search('', { league: ['osl'], year: ['2001'], kind: ['game'] })), ['g1', 'g2']);
  assert.deepEqual(ids(search('alpha', { matchup: ['PT', 'TZ'], league: ['osl'] })), ['g1', 'g2']);
  assert.deepEqual(ids(search('bravo', { league: ['osl'], year: [2002] })), []);
});

test('counts: each option shows what picking it would give, own facet excluded', () => {
  const { counts } = search('', { league: ['osl'] });
  assert.equal(counts.total, 3);
  assert.deepEqual(counts.league, { osl: 3, msl: 2 });
  assert.deepEqual(counts.year, { 2001: 3, 2002: 0 });
  assert.deepEqual(counts.kind, { game: 2, interview: 1 });
  assert.equal(counts.matchup.PT, 1);
  assert.equal(counts.player.alpha, 3);
});

test('counts honour the text query and keep zero-count options', () => {
  const { counts } = search('bravo', {});
  assert.equal(counts.total, 2);
  assert.equal(counts.year['2001'], 1);
  assert.equal(counts.year['2002'], 1);
  assert.equal(counts.player.delta, 0);
  assert.equal(counts.map.m2, 0);
});

test('count shown for a selected option equals the result count', () => {
  const r = search('', { league: ['osl'], year: ['2001'] });
  assert.equal(r.counts.league.osl, r.results.length);
  assert.equal(r.counts.year['2001'], r.results.length);
});

test('URL params round-trip', () => {
  const sel = { league: ['osl'], year: ['2001', '2002'], matchup: ['PT'] };
  const p = toParams('  alpha ', sel);
  assert.equal(p.toString(), 'q=alpha&year=2001%2C2002&league=osl&mu=PT');
  assert.deepEqual(fromParams(new URLSearchParams(p.toString())), { query: 'alpha', selection: sel });
  assert.equal(toParams('', {}).toString(), '');
  assert.deepEqual(fromParams(new URLSearchParams('bogus=1')), { query: '', selection: {} });
});

test('buildRecords from the fixture catalog: games and the item', () => {
  const { records, labels } = buildRecords(loadCatalog('test/fixtures/catalog'));
  const games = records.filter((r) => r.kind === 'game');
  assert.equal(games.length, 5);
  const item = records.find((r) => r.kind === 'interview');
  assert.equal(item.url, 'https://example.com/fixture-interview');
  assert.deepEqual(item.players, ['alpha']);
  assert.equal(item.league, 'fixture-series');
  assert.equal(labels.league['fixture-series'], 'Fixture Series');
  assert.equal(games.find((g) => g.id === 'game:fixture-league/final#2').grade, 'X');
  assert.equal(games.find((g) => g.matchup === 'TZ').year, 2000);
  assert.equal(games.filter((g) => g.matchup === null).length, 1);
  const s = createSearch(records);
  assert.equal(s('', { player: ['alpha'], kind: ['game'] }).results.length, 4);
});
