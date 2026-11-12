import { test } from 'node:test';
import assert from 'node:assert/strict';
import { helpRows, formUrl, missingItems } from '../src/lib/help.js';

const ev = (id, tier, year, completeness = 'partial') => ({ id, tier, year, completeness, name: id });
const game = (copies = 0, lost = false) => ({ set: 1, lost, copies: Array.from({ length: copies }, () => ({ url: 'x' })) });
const match = (event, id, over = {}) => ({
  id, event, fullId: `${event}/${id}`, completeness: 'complete', date: '2000-01-01', winner: 'a', score: '1-0', games: [game(1)], ...over,
});

test('helpRows sorts big before mid before small, then year, then id', () => {
  const events = [ev('small-99', 'small', 1999), ev('big-02', 'big', 2002), ev('mid-01', 'mid', 2001), ev('big-01', 'big', 2001)];
  const rows = helpRows(events, []);
  assert.deepEqual(rows.map((r) => r.recordId), ['big-01', 'big-02', 'mid-01', 'small-99']);
});

test('match rows inherit the event tier and year for sorting', () => {
  const events = [ev('mid-e', 'mid', 1999, 'complete'), ev('big-e', 'big', 2005, 'complete')];
  const matches = [match('mid-e', 'm1', { games: [game(0)] }), match('big-e', 'm2', { games: [game(0)] })];
  assert.deepEqual(helpRows(events, matches).map((r) => r.recordId), ['big-e/m2', 'mid-e/m1']);
});

test('a match is not listed twice for unfinished and missing fields', () => {
  const rows = helpRows([ev('e', 'big', 2000, 'complete')], [match('e', 'm', { completeness: 'stub', date: null })]);
  assert.deepEqual(rows.map((r) => r.type), ['match']);
});

test('missing fields on a complete match get their own row', () => {
  const rows = helpRows([ev('e', 'big', 2000, 'complete')], [match('e', 'm', { winner: null, score: null })]);
  assert.deepEqual(rows.map((r) => [r.type, r.detail]), [['nofields', 'missing winner, score']]);
});

test('all-lost matches are not in the no-copy list; others are', () => {
  const events = [ev('e', 'big', 2000, 'complete')];
  const matches = [match('e', 'lost', { games: [game(0, true), game(0, true)] }), match('e', 'none', { games: [game(0)] }), match('e', 'mixed', { games: [game(0, true), game(0)] })];
  assert.deepEqual(helpRows(events, matches).map((r) => [r.type, r.recordId]), [['nocopy', 'e/mixed'], ['nocopy', 'e/none']]);
});

test('formUrl: each form prefills exactly its own fields', () => {
  const copy = new URL(formUrl('https://gh.test/r', 'copy', { recordId: 'e/m', game: 2 }));
  assert.equal(copy.searchParams.get('template'), 'submit-copy.yml');
  assert.deepEqual([copy.searchParams.get('event_id'), copy.searchParams.get('match_id'), copy.searchParams.get('game_number')], ['e', 'm', '2']);
  const info = new URL(formUrl('https://gh.test/r', 'info', { recordId: 'e/m' }));
  assert.equal(info.searchParams.get('template'), 'submit-fix.yml');
  assert.equal(info.searchParams.get('record'), 'match:e/m');
  assert.equal(info.searchParams.get('title'), '[e/m] ');
  assert.equal(new URL(formUrl('https://gh.test/r', 'info', { recordId: 'e' })).searchParams.get('record'), 'event:e');
  const add = new URL(formUrl('https://gh.test/r', 'addmatch', { recordId: 'e' }));
  assert.deepEqual([add.searchParams.get('template'), add.searchParams.get('event_id')], ['submit-match.yml', 'e']);
});

test('missingItems: complete event none; stub event with expected games; match without copy', () => {
  assert.deepEqual(missingItems(ev('e', 'big', 2000, 'complete')), []);
  const stub = { ...ev('e', 'big', 2000, 'stub'), expected_games: 5 };
  assert.deepEqual(missingItems(stub, [match('e', 'm')]).map((i) => i.form), ['info', 'addmatch']);
  const m = match('e', 'm', { games: [game(1), { ...game(0), set: 2 }, { ...game(0, true), set: 3 }] });
  assert.deepEqual(missingItems(m).map((i) => [i.form, i.game]), [['copy', 2]]);
});

test('complete match missing date/winner/score offers the fix form', () => {
  const m = match('e', 'm', { date: null, winner: null, score: null });
  assert.deepEqual(missingItems(m).map((i) => [i.form, i.text]), [['info', 'Missing date, winner, score.']]);
});

test('a match whose every game is lost has no copy gap', () => {
  assert.deepEqual(missingItems(match('e', 'm', { games: [game(0, true), game(0, true)] })), []);
});

test('a complete event with fewer games than expected still surfaces the gap', () => {
  const e = { ...ev('e', 'big', 2000, 'complete'), expected_games: 3 };
  assert.deepEqual(missingItems(e, [match('e', 'm')]).map((i) => i.form), ['addmatch']);
});
