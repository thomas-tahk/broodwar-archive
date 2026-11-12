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
  try {
    execSync(`npm run build -- --outDir ${out}`, { env: { ...process.env, CATALOG_DIR: catalogDir }, stdio: 'pipe' });
    return fs.readFileSync(`${out}/events/fixture-league/index.html`, 'utf8');
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
};
const cells = (html) => (html.match(/<a class="gcell"[\s\S]*?<\/a>/g) ?? []);
const find = (html, match, set) => {
  const c = cells(html).find((a) => a.includes(`/matches/fixture-league/${match}/"`) && a.includes(`data-set="${set}"`));
  assert.ok(c, `cell ${match} G${set}`);
  return c;
};
const badge = (c) => c.match(/<span class="grade"[^>]*>([^<]*)/)[1];

test('fixture event gap grid', () => {
  const html = buildEvent(FIXTURE);
  assert.match(html, /class="gapgrid"/);
  const expected = [
    ['ro8-a-1', 1, 'A', 'false', 'Original', 'Alpha vs Bravo · G1'],
    ['ro8-a-2', 1, 'none', 'true', 'No copy', 'Bravo vs Charlie · G1'],
    ['final', 1, 'D', 'true', 'Damaged', 'Alpha vs Charlie · G1'],
    ['final', 2, 'X', 'true', 'Footage lost', 'Alpha vs Charlie · G2'],
    ['final', 3, 'none', 'true', 'Not graded', 'Alpha vs Charlie · G3'],
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
  assert.ok(!html.includes('data-placeholder-count'));
  assert.ok(html.includes('href="https://github.com/thomas-tahk/broodwar-archive/issues/new/choose"'));
  assert.ok(html.includes('Know where a copy is? Add it'));
});

test('event with no matches shows only placeholders, no summary', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bw-cat66-'));
  fs.cpSync(FIXTURE, dir, { recursive: true });
  fs.rmSync(`${dir}/matches/fixture-league`, { recursive: true });
  const ev = `${dir}/events/fixture-league.yaml`;
  fs.writeFileSync(ev, fs.readFileSync(ev, 'utf8').replace('expected_games: 6', 'expected_games: 66'));
  let html;
  try { html = buildEvent(dir); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  assert.equal((html.match(/data-placeholder="true"/g) ?? []).length, 0);
  assert.equal((html.match(/data-placeholder-count="66"/g) ?? []).length, 1);
  assert.ok(html.includes('66 games not catalogued yet'));
  assert.ok(html.includes('Know where a copy is? Add it'));
  assert.ok(html.includes('66 more games expected (per source) are not catalogued yet'));
  assert.ok(!html.includes('gap-summary'));
});

const withCatalog = (expected, dropMatches = []) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bw-catx-'));
  try {
    fs.cpSync(FIXTURE, dir, { recursive: true });
    for (const m of dropMatches) fs.rmSync(`${dir}/matches/fixture-league/${m}.yaml`);
    const ev = `${dir}/events/fixture-league.yaml`;
    fs.writeFileSync(ev, fs.readFileSync(ev, 'utf8').replace('expected_games: 6', `expected_games: ${expected}`));
    return buildEvent(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
};
const count = (html, re) => (html.match(re) ?? []).length;

test('collapse threshold: shortfall 6 keeps tiles', () => {
  const html = withCatalog(11); // 5 catalogued + 6 missing
  assert.equal(count(html, /data-placeholder="true"/g), 6);
  assert.ok(!html.includes('data-placeholder-count'));
});

test('collapse threshold: shortfall 7 collapses to one block', () => {
  const html = withCatalog(12); // 5 catalogued + 7 missing
  assert.equal(count(html, /data-placeholder-count="7"/g), 1);
  assert.equal(count(html, /data-placeholder="true"/g), 0);
  assert.ok(html.includes('7 games not catalogued yet'));
});

test('no gaps and no shortfall: no call to action', () => {
  const html = withCatalog(1, ['final', 'ro8-a-2']); // only the A-graded game
  assert.ok(html.includes('data-good="1" data-total="1"'));
  assert.ok(!html.includes('Know where a copy is? Add it'));
  assert.ok(!html.includes('gap-help'));
});
