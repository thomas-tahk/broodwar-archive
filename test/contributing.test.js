import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const doc = fs.readFileSync('CONTRIBUTING.md', 'utf8');

function template(name) {
  const m = doc.match(new RegExp(`<!-- template:${name} -->\\n\`\`\`yaml\\n([\\s\\S]*?)\`\`\``));
  assert.ok(m, `no template:${name} block in CONTRIBUTING.md`);
  return m[1];
}

function put(dir, rel, text) {
  fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
  fs.writeFileSync(path.join(dir, rel), text);
}

for (const heading of ['Add without git', 'Add an item', 'Add an event', 'Add a series', 'Completeness', 'Add with git']) {
  test(`CONTRIBUTING has a "${heading}" section`, () => {
    assert.match(doc, new RegExp(`^## ${heading}\\b`, 'm'));
  });
}

test('CONTRIBUTING puts the no-git path before the git path and links every form', () => {
  assert.ok(doc.indexOf('## Add without git') < doc.indexOf('## Add with git'));
  for (const f of ['event', 'match', 'copy', 'item', 'fix']) assert.ok(doc.includes(`template=submit-${f}.yml`), f);
  assert.ok(doc.includes('accepted-submission'));
});

test('CONTRIBUTING templates, applied as written, pass the validator', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'contrib-'));
  try {
    fs.cpSync('test/fixtures/catalog', dir, { recursive: true });
    put(dir, 'players/player-one.yaml', template('player'));
    put(dir, 'players/player-two.yaml', template('player').replaceAll('player-one', 'player-two'));
    put(dir, 'maps/map-id.yaml', template('map'));
    // Only substitution: the event folder must be a real event in the copied fixture.
    put(dir, 'matches/fixture-league/match-id.yaml', template('match').replace('event-id', 'fixture-league'));
    const r = spawnSync('node', ['tools/catalog/validate.js', dir], { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /8 matches, 6 players, 4 maps/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
