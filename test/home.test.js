import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { addedDates } from '../src/lib/gitDates.js';
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

test('item year: an undated item only about an event still gets that event year (shared with search)', () => {
  assert.equal(itemYear({ id: 'x', links: { about: ['event:e1'] } }, resolve), 2001);
  assert.equal(itemYear({ id: 'x', links: { features: ['match:e1/m1'] } }, resolve), 2003);
});

test('latest: newest added first; undated items count as newest in reverse file order', () => {
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
  const addedAt = { a: '2026-01-01T00:00:00+00:00', b: '2026-03-01T00:00:00+00:00', c: '2026-02-01T00:00:00+00:00' };
  assert.deepEqual(sortLatest(items, addedAt).map((i) => i.id), ['d', 'b', 'c', 'a']);
  assert.deepEqual(sortLatest(items, {}).map((i) => i.id), ['d', 'c', 'b', 'a']);
});

test('git added-dates: a renamed item file still gets an add date (does not pin to the top)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bw-git-'));
  try {
    const run = (args, date) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args],
      { cwd: dir, stdio: 'pipe', env: { ...process.env, GIT_COMMITTER_DATE: date, GIT_AUTHOR_DATE: date } });
    run(['init', '-q'], '2026-01-01T00:00:00Z');
    fs.mkdirSync(path.join(dir, 'items'));
    fs.writeFileSync(path.join(dir, 'items/old-name.yaml'), 'id: old-name\nkind: article\ntitle: body long enough for git to detect a rename\n');
    run(['add', '.'], '2026-01-01T00:00:00Z');
    run(['commit', '-qm', 'add'], '2026-01-01T00:00:00Z');
    run(['mv', 'items/old-name.yaml', 'items/new-name.yaml'], '2026-02-01T00:00:00Z');
    run(['commit', '-qm', 'rename'], '2026-02-01T00:00:00Z');
    const dates = addedDates(dir, 'items');
    assert.equal(dates['new-name'], '2026-02-01T00:00:00Z');
    assert.ok(dates['old-name'], 'original add recorded too');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
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
