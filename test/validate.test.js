import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const run = (...args) =>
  spawnSync('node', ['tools/catalog/validate.js', ...args], { encoding: 'utf8' });

test('valid fixture catalog passes', () => {
  const r = run('test/fixtures/catalog');
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /1 events?, 3 matches, 3 players, 2 maps/);
});

test('real catalog/ passes', () => {
  const r = run();
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

const cases = {
  'missing-sources': ['ro8-a-2.yaml', 'sources'],
  'bad-grade': ['final.yaml', 'games[0].copies[0].grade'],
  'dangling-player': ['final.yaml', 'players[1]'],
  'dangling-map': ['final.yaml', 'games[1].map'],
  'duplicate-id': ['ro8-a-2.yaml', 'id'],
  'filename-mismatch': ['bravo.yaml', 'id'],
  'copy-no-url': ['final.yaml', 'games[0].copies[0].url'],
  'winner-not-player': ['final.yaml', 'winner'],
};

for (const [name, [file, field]] of Object.entries(cases)) {
  test(`broken/${name} fails naming file and field`, () => {
    const r = run(`test/fixtures/broken/${name}`);
    assert.equal(r.status, 1, r.stdout + r.stderr);
    const line = r.stderr.split('\n').find((l) => l.includes(file) && l.includes(`: ${field}: `));
    assert.ok(line, `no "<file>: ${field}: msg" line in:\n${r.stderr}`);
  });
}
