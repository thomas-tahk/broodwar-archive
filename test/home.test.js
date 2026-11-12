import { test } from 'node:test';
import assert from 'node:assert/strict';
import { itemYear, sortLatest, sortYears, featuredFrom } from '../src/lib/homeLogic.js';

const records = {
  'event:e1': { type: 'event', record: { id: 'e1', year: 2001 } },
  'event:e2': { type: 'event', record: { id: 'e2', year: null } },
  'match:e1/m1': { type: 'match', record: { id: 'm1', event: 'e1', date: '2003-05-01' } },
  'match:e1/m2': { type: 'match', record: { id: 'm2', event: 'e1', date: null } },
};
const resolve = (ref) => records[ref] ?? null;
const itemFrom = (...from) => ({ id: 'x', links: { from } });

test('item year: own date, from-event, from-match date, from-match event, none', () => {
  assert.equal(itemYear({ id: 'x', date: '1999-01-02', links: {} }, resolve), 1999);
  assert.equal(itemYear(itemFrom('event:e1'), resolve), 2001);
  assert.equal(itemYear(itemFrom('match:e1/m1'), resolve), 2003);
  assert.equal(itemYear(itemFrom('match:e1/m2'), resolve), 2001);
  assert.equal(itemYear(itemFrom('event:e2'), resolve), null);
  assert.equal(itemYear({ id: 'x', links: { about: ['player:a'] } }, resolve), null);
});

test('latest: newest added first; undated items count as newest in reverse file order', () => {
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
  const addedAt = { a: '2026-01-01T00:00:00+00:00', b: '2026-03-01T00:00:00+00:00', c: '2026-02-01T00:00:00+00:00' };
  assert.deepEqual(sortLatest(items, addedAt).map((i) => i.id), ['d', 'b', 'c', 'a']);
  assert.deepEqual(sortLatest(items, {}).map((i) => i.id), ['d', 'c', 'b', 'a']);
});

test('years descend and the unknown year is last', () => {
  const years = [{ year: null }, { year: 2000 }, { year: 2002 }];
  assert.deepEqual(sortYears(years).map((y) => y.year), [2002, 2000, null]);
});

test('featured: dangling refs are skipped, order kept, empty stays empty', () => {
  const describe = ({ record }) => ({ label: record.id, href: `/${record.id}/` });
  const cards = featuredFrom([{ ref: 'event:gone' }, { ref: 'event:e1', blurb: 'hi' }], resolve, describe);
  assert.deepEqual(cards, [{ type: 'event', label: 'e1', href: '/e1/', blurb: 'hi' }]);
  assert.deepEqual(featuredFrom([], resolve, describe), []);
});
