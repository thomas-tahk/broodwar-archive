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

// Each case lists every expectation: [file, field, message pattern]. All must appear.
const cases = {
  'missing-sources': [['ro8-a-2.yaml', 'sources', /needs at least one source/]],
  'bad-grade': [['final.yaml', 'games[0].copies[0].grade', /must be one of: A, B, C, D, null/]],
  'dangling-player': [['final.yaml', 'players[1]', /player "nobody" does not exist/]],
  'dangling-map': [['final.yaml', 'games[1].map', /map "no-such-map" does not exist/]],
  // A true duplicate id needs two files with the same name, which a folder forbids,
  // so a duplicate always also trips the filename rule. Pin both rules.
  'duplicate-id': [
    ['ro8-a-2.yaml', 'id', /must match the file name/],
    ['ro8-a-2.yaml', 'id', /already used by/],
  ],
  'filename-mismatch': [['bravo.yaml', 'id', /must match the file name/]],
  'copy-no-url': [['final.yaml', 'games[0].copies[0].url', /field is missing/]],
  'winner-not-player': [['final.yaml', 'winner', /not one of this match's players/]],
  'same-player': [['ro8-a-2.yaml', 'players[1]', /listed twice/]],
  'bad-date': [['ro8-a-2.yaml', 'date', /not a real calendar date/]],
  'field-sources-bad': [['ro8-a-1.yaml', 'field_sources', /"dat" is not a field of a match/]],
  'map-version-number': [['map-one.yaml', 'version', /Put it in quotes, e\.g\. "1\.1"/]],
  'misplaced-file': [['alpha-copy.yml', '(file location)', /wrong place/]],
};

for (const [name, expectations] of Object.entries(cases)) {
  test(`broken/${name} fails naming file, field and rule`, () => {
    const r = run(`test/fixtures/broken/${name}`);
    assert.equal(r.status, 1, r.stdout + r.stderr);
    const lines = r.stderr.split('\n');
    for (const [file, field, message] of expectations) {
      const hit = lines.find((l) => l.includes(file) && l.includes(`: ${field}: `) && message.test(l));
      assert.ok(hit, `no "<file>: ${field}: ${message}" line in:\n${r.stderr}`);
    }
  });
}

test('importing validate.js does not run the CLI', async () => {
  const mod = await import('../tools/catalog/validate.js');
  assert.equal(typeof mod.validateCatalog, 'function');
});

test('CATALOG_DIR is used when no argument is given', () => {
  const r = spawnSync('node', ['tools/catalog/validate.js'], {
    encoding: 'utf8', env: { ...process.env, CATALOG_DIR: 'test/fixtures/catalog' },
  });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /3 matches/);
});
