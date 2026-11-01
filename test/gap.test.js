import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import fs from 'node:fs';

test('event gap grid', () => {
  fs.rmSync('dist', { recursive: true, force: true });
  execSync('npm run build', { env: { ...process.env, CATALOG_DIR: 'test/fixtures/catalog' }, stdio: 'pipe' });
  const html = fs.readFileSync('dist/events/fixture-league/index.html', 'utf8');
  const cell = (match, set) => {
    const tags = html.match(/<a class="gcell"[^>]*>/g) ?? [];
    const t = tags.find((a) => a.includes(`/matches/fixture-league/${match}/"`) && a.includes(`data-set="${set}"`));
    assert.ok(t, `cell ${match} G${set}`);
    return t;
  };
  assert.match(html, /class="gapgrid"/);
  assert.match(cell('ro8-a-1', 1), /data-grade="A"[^>]*data-gap="false"/);
  assert.match(cell('ro8-a-2', 1), /data-grade="none"[^>]*data-gap="true"/);
  assert.match(cell('final', 1), /data-grade="D"[^>]*data-gap="true"/);
  assert.match(cell('final', 2), /data-grade="X"[^>]*data-gap="true"/);
  assert.match(cell('final', 3), /data-grade="none"[^>]*data-gap="true"/);
  assert.match(html, /data-good="1" data-total="5"/);
  assert.match(html, /1 of 5 catalogued/);
  assert.equal((html.match(/data-placeholder="true"/g) ?? []).length, 1);
});
