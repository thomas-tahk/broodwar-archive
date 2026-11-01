import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const read = (p) => fs.readFileSync(`dist/${p}/index.html`, 'utf8');
const build = (catalogDir) => {
  fs.rmSync('dist', { recursive: true, force: true });
  execSync('npm run build', { env: { ...process.env, CATALOG_DIR: catalogDir }, stdio: 'pipe' });
};

test('fixture catalog', async (t) => {
  build('test/fixtures/catalog');

  await t.test('home lists the event', () => {
    assert.match(read(''), /href="\/broodwar-archive\/events\/fixture-league\/"/);
  });

  await t.test('event page links all matches under base', () => {
    const html = read('events/fixture-league');
    for (const m of ['ro8-a-1', 'ro8-a-2', 'final']) {
      assert.ok(html.includes(`href="/broodwar-archive/matches/fixture-league/${m}/"`), m);
    }
  });

  await t.test('ro8-a-1 shows both copies, grades A and B, sources', () => {
    const html = read('matches/fixture-league/ro8-a-1');
    for (const s of ['https://example.com/video/official-1', 'https://example.com/video/near-source-1',
      'https://example.com/fixture-league/bracket', 'Watch on example.com']) assert.ok(html.includes(s), s);
    assert.match(html, /data-grade="A"/);
    assert.match(html, /data-grade="B"/);
    assert.match(html, /rel="noopener/);
  });

  await t.test('final shows set 2 lost (X) and field_sources', () => {
    const html = read('matches/fixture-league/final');
    assert.match(html, /data-grade="X"/);
    assert.match(html, /Lost/);
    assert.ok(html.includes('https://example.com/fixture-league/final-vod-thread'));
  });

  await t.test('ro8-a-2 shows no copy known and Unknown', () => {
    const html = read('matches/fixture-league/ro8-a-2');
    assert.match(html, /No copy known/);
    assert.match(html, /Unknown/);
  });
});

test('build succeeds with default empty catalog', () => {
  build('');
  assert.match(read(''), /No events/);
});
