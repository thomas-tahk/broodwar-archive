import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const FIXTURE = 'test/fixtures/catalog';
// Own outDir so this file never races other tests over dist/.
const buildEvent = (catalogDir) => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'bw-gap-'));
  execSync(`npm run build -- --outDir ${out}`, { env: { ...process.env, CATALOG_DIR: catalogDir }, stdio: 'pipe' });
  return fs.readFileSync(`${out}/events/fixture-league/index.html`, 'utf8');
};
const cells = (html) => (html.match(/<a class="gcell"[\s\S]*?<\/a>/g) ?? []);
const find = (html, match, set) => {
  const c = cells(html).find((a) => a.includes(`/matches/fixture-league/${match}/"`) && a.includes(`data-set="${set}"`));
  assert.ok(c, `cell ${match} G${set}`);
  return c;
};
const badge = (c) => c.match(/<span class="grade"[^>]*>([^<]*)<\/span>/)[1];

test('fixture event gap grid', () => {
  const html = buildEvent(FIXTURE);
  assert.match(html, /class="gapgrid"/);
  const expected = [
    ['ro8-a-1', 1, 'A', 'false', 'A', 'Alpha vs Bravo · G1'],
    ['ro8-a-2', 1, 'none', 'true', 'No copy', 'Bravo vs Charlie · G1'],
    ['final', 1, 'D', 'true', 'D', 'Alpha vs Charlie · G1'],
    ['final', 2, 'X', 'true', 'X · Lost', 'Alpha vs Charlie · G2'],
    ['final', 3, 'none', 'true', 'Ungraded', 'Alpha vs Charlie · G3'],
  ];
  for (const [m, set, grade, gap, text, label] of expected) {
    const c = find(html, m, set);
    assert.ok(c.includes(`data-grade="${grade}"`), `${m} G${set} grade`);
    assert.ok(c.includes(`data-gap="${gap}"`), `${m} G${set} gap`);
    assert.equal(badge(c), text, `${m} G${set} badge`);
    assert.equal(c.includes('class="gaptag"'), gap === 'true', `${m} G${set} GAP tag`);
    assert.ok(c.includes(label), `${m} G${set} label ${label}`);
  }
  assert.ok(html.includes('data-good="1" data-total="5"'));
  assert.ok(html.includes('1 of 5 catalogued games have a good copy (A–C)'));
  assert.ok(html.includes('1 more game expected (per source) is not catalogued yet'));
  assert.equal((html.match(/data-placeholder="true"/g) ?? []).length, 1);
});

test('event with no matches shows only placeholders, no summary', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bw-cat66-'));
  fs.cpSync(FIXTURE, dir, { recursive: true });
  fs.rmSync(`${dir}/matches/fixture-league`, { recursive: true });
  const ev = `${dir}/events/fixture-league.yaml`;
  fs.writeFileSync(ev, fs.readFileSync(ev, 'utf8').replace('expected_games: 6', 'expected_games: 66'));
  const html = buildEvent(dir);
  assert.equal((html.match(/data-placeholder="true"/g) ?? []).length, 66);
  assert.ok(html.includes('66 more games expected (per source) are not catalogued yet'));
  assert.ok(!html.includes('gap-summary'));
});
