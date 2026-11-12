import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parse } from 'yaml';
import { FORMS, templateYaml } from '../tools/submit/forms.js';
import { processSubmission, SubmissionError } from '../tools/submit/index.js';
import { run } from '../tools/submit/run.js';

/** Body exactly as GitHub renders an issue form: "### Label", blank line, value or "_No response_". */
function issueBody(kind, values) {
  return FORMS[kind].fields
    .map((f) => `### ${f.label}\n\n${values[f.id] ?? '_No response_'}`)
    .join('\n\n');
}

const SAMPLES = {
  event: {
    event_id: 'new-cup', event_name: 'New Cup 2001', year: '2001', league: 'NC', broadcaster: 'Example TV',
    series_id: 'fixture-series', tier: 'small', event_kind: 'cup', sources: 'https://example.com/new-cup\nhttps://example.com/other',
  },
  match: {
    event_id: 'fixture-league', match_id: 'ro8-b-1', stage: 'Round of 8', group: 'B', date: '2000-05-02', format: 'Bo3',
    player1: 'alpha', player2: 'bravo', winner: 'alpha', score: '2-0',
    games: '1 | map-one | T Z | alpha\n2 | - | P R | alpha', sources: 'https://example.com/ro8-b-1',
  },
  copy: {
    event_id: 'fixture-league', match_id: 'ro8-a-1', game_number: '1', copy_link: 'https://example.com/v/new',
    copy_kind: 'fan-upload', copy_title: 'a title', resolution: '480p', fps: '30', segment_start: '00:10:00', segment_end: '00:30:00',
  },
  item: {
    item_id: 'new-article', item_kind: 'article', title: 'A new article', date: '2001-02-03', language: 'en',
    links: 'https://example.com/article', about: 'player:alpha, event:fixture-league\nmatch:fixture-league/final',
  },
  fix: { record: 'event:fixture-league', field: 'name', new_value: 'Fixture League 2000 (corrected)', source: 'https://example.com/proof' },
};

function freshCatalog() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'submit-'));
  fs.cpSync('test/fixtures/catalog', dir, { recursive: true });
  return dir;
}

function submit(kind, overrides = {}) {
  const dir = freshCatalog();
  const out = run(issueBody(kind, { ...SAMPLES[kind], ...overrides }), dir);
  return { dir, out };
}

for (const kind of Object.keys(FORMS)) {
  test(`${kind}: sample issue body becomes a file that passes the validator`, () => {
    const { dir, out } = submit(kind);
    try {
      assert.equal(out.status, 'ok', out.comment);
      assert.equal(out.kind, kind);
      assert.ok(fs.existsSync(path.join(dir, out.file)));
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
}

test('event: yaml has the expected fields and blanks become null', () => {
  const dir = freshCatalog();
  try {
    const r = processSubmission(issueBody('event', SAMPLES.event), dir);
    assert.equal(r.file, 'events/new-cup.yaml');
    assert.deepEqual(parse(r.text), {
      id: 'new-cup', name: 'New Cup 2001', league: 'NC', sponsor: null, year: 2001, broadcaster: 'Example TV', organizer: null,
      series: 'fixture-series', tier: 'small', kind: 'cup', tags: [], completeness: 'stub',
      sources: [{ url: 'https://example.com/new-cup' }, { url: 'https://example.com/other' }],
    });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('match: games lines parse, "-" is null, file lands in the event folder', () => {
  const dir = freshCatalog();
  try {
    const r = processSubmission(issueBody('match', SAMPLES.match), dir);
    assert.equal(r.file, 'matches/fixture-league/ro8-b-1.yaml');
    const m = parse(r.text);
    assert.deepEqual(m.players, ['alpha', 'bravo']);
    assert.deepEqual(m.games[1], { set: 2, map: null, races: ['P', 'R'], winner: 'alpha', lost: false, copies: [] });
    assert.equal(m.completeness, 'partial');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('copy: appended to the right game, grade left null, existing comments kept', () => {
  const dir = freshCatalog();
  try {
    const before = fs.readFileSync(path.join(dir, 'matches/fixture-league/ro8-a-1.yaml'), 'utf8');
    const r = processSubmission(issueBody('copy', SAMPLES.copy), dir);
    const after = parse(r.text);
    const was = parse(before).games[0].copies.length;
    const added = after.games[0].copies.at(-1);
    assert.equal(after.games[0].copies.length, was + 1);
    assert.deepEqual(added, {
      url: 'https://example.com/v/new', kind: 'fan-upload', title: 'a title', uploader: null, resolution: '480p', fps: 30,
      grade: null, grade_note: null, segment: { start: '00:10:00', end: '00:30:00' },
    });
    assert.equal(r.text.split('\n')[0], before.split('\n')[0]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('copy: works on a game whose copies is an empty list', () => {
  const dir = freshCatalog();
  try {
    const file = path.join(dir, 'matches/fixture-league/ro8-a-1.yaml');
    fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(/copies:[\s\S]*?(?=\n  - set: 2|\n[a-z]|$)/, 'copies: []'));
    const r = processSubmission(issueBody('copy', SAMPLES.copy), dir);
    assert.equal(parse(r.text).games[0].copies.length, 1);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('fix: changes one field, adds the source, keeps the rest', () => {
  const dir = freshCatalog();
  try {
    const r = processSubmission(issueBody('fix', SAMPLES.fix), dir);
    const e = parse(r.text);
    assert.equal(e.name, 'Fixture League 2000 (corrected)');
    assert.equal(e.sources.at(-1).url, 'https://example.com/proof');
    assert.equal(e.year, 2000);
    assert.match(r.text, /^# Test fixture/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('fix: null, numbers and nested game fields work', () => {
  const dir = freshCatalog();
  try {
    assert.equal(parse(processSubmission(issueBody('fix', { ...SAMPLES.fix, field: 'sponsor', new_value: 'null' }), dir).text).sponsor, null);
    assert.equal(parse(processSubmission(issueBody('fix', { ...SAMPLES.fix, field: 'year', new_value: '2001' }), dir).text).year, 2001);
    const g = processSubmission(issueBody('fix', { ...SAMPLES.fix, record: 'match:fixture-league/ro8-a-1', field: 'games.1.map', new_value: 'map-two' }), dir);
    assert.equal(parse(g.text).games[0].map, 'map-two', 'games.1 is the FIRST game');
    assert.throws(() => processSubmission(issueBody('fix', { ...SAMPLES.fix, record: 'match:fixture-league/ro8-a-1', field: 'games.0.map', new_value: 'map-two' }), dir), /counted from 1/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function rejects(kind, overrides, pattern) {
  const dir = freshCatalog();
  try {
    assert.throws(() => processSubmission(issueBody(kind, { ...SAMPLES[kind], ...overrides }), dir), (e) => e instanceof SubmissionError && pattern.test(e.message));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('malformed: not an issue form at all', () => {
  assert.throws(() => processSubmission('hello, please add stuff', 'catalog'), /does not look like a submission form/);
  assert.throws(() => processSubmission('', 'catalog'), /does not look like a submission form/);
  assert.throws(() => processSubmission(undefined, 'catalog'), SubmissionError);
});

test('malformed: unknown headings', () => {
  assert.throws(() => processSubmission('### Foo\n\nbar\n\n### Baz\n\nqux', 'catalog'), /do not match any submission form: Foo, Baz/);
});

test('malformed: empty required fields are all listed at once', () => {
  rejects('event', { event_id: null, event_name: null }, /"Event id" is required[\s\S]*"Event name" is required/);
});

test('malformed: bad dropdown value, bad id, path traversal, bad numbers', () => {
  rejects('event', { tier: 'huge' }, /"Tier" must be one of: big, mid, small/);
  rejects('event', { event_id: 'Bad Id' }, /Event id "Bad Id" is not allowed/);
  rejects('match', { event_id: '../../etc', match_id: 'x' }, /Event id "..\/..\/etc" is not allowed/);
  rejects('fix', { record: 'match:../x/y' }, /a match is match:<event-id>\/<match-id>/);
  rejects('fix', { record: 'player:../boxer' }, /Record id "..\/boxer" is not allowed/);
  rejects('event', { year: 'soon' }, /Year "soon" must be a whole number/);
  rejects('copy', { fps: 'fast' }, /Frame rate "fast" must be a number/);
  rejects('copy', { segment_end: null }, /Segment start and end go together/);
  rejects('match', { games: '1 | map-one' }, /needs 4 parts/);
});

test('malformed: refusing to overwrite or edit what does not exist', () => {
  rejects('event', { event_id: 'fixture-league' }, /already exists/);
  rejects('copy', { game_number: '9' }, /has no game 9/);
  rejects('copy', { match_id: 'nope' }, /does not exist/);
  rejects('fix', { field: 'no_such_field' }, /has no field "no_such_field"/);
  rejects('fix', { field: 'id' }, /cannot be changed/);
  rejects('fix', { field: 'name; rm -rf' }, /is not allowed/);
  rejects('fix', { record: 'bogus' }, /must look like kind:id/);
});

test('run: parse failure is rejected with a readable comment, no file written', () => {
  const dir = freshCatalog();
  try {
    const out = run('nonsense', dir);
    assert.equal(out.status, 'rejected');
    assert.match(out.comment, /Could not read this submission/);
    assert.match(out.comment, /re-apply/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('run: well-formed but validator-failing submission reports the validator errors', () => {
  const { dir, out } = submit('match', { player2: 'nobody' });
  try {
    assert.equal(out.status, 'invalid');
    assert.match(out.comment, /nobody/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('issue templates are exactly what forms.js generates (run: node tools/submit/gen-templates.js)', () => {
  for (const form of Object.values(FORMS)) {
    assert.equal(fs.readFileSync(`.github/ISSUE_TEMPLATE/${form.file}`, 'utf8'), templateYaml(form), form.file);
    const t = parse(templateYaml(form));
    assert.equal(t.body.length, form.fields.length);
  }
});

test('workflow is hardened: no ${{ in run blocks, no step contexts in job env, pinned actions', () => {
  const raw = fs.readFileSync('.github/workflows/submit.yml', 'utf8');
  const wf = parse(raw);
  assert.doesNotMatch(raw, /pull_request_target/);
  assert.equal(wf.jobs.submit.if, "github.event.label.name == 'accepted-submission'");
  for (const [k, v] of Object.entries(wf.jobs.submit.env)) {
    assert.doesNotMatch(String(v), /\b(runner|steps|job)\./, `job env ${k}`);
  }
  const steps = wf.jobs.submit.steps;
  for (const step of steps.filter((st) => st.run)) assert.doesNotMatch(step.run, /\$\{\{/, step.name ?? step.run);
  for (const step of steps.filter((st) => st.uses)) assert.match(step.uses, /@[0-9a-f]{40}$/, step.uses);
  assert.equal(steps.find((st) => st.uses?.startsWith('actions/checkout')).with['persist-credentials'], false);
  assert.match(steps.find((st) => st.run?.startsWith('npm ci')).run, /--ignore-scripts/);
  assert.equal(steps.at(-1).if, 'always()');
  assert.equal(wf.jobs.submit.env.GH_TOKEN, undefined);
  assert.equal(wf.permissions.actions, 'write');
});

test('ci.yml can be dispatched (submission PRs do not trigger it on their own)', () => {
  assert.ok('workflow_dispatch' in parse(fs.readFileSync('.github/workflows/ci.yml', 'utf8')).on);
});

test('old templates are gone, replaced by the submit forms', () => {
  assert.ok(!fs.existsSync('.github/ISSUE_TEMPLATE/new-copy.yml'));
  assert.ok(!fs.existsSync('.github/ISSUE_TEMPLATE/wrong-info.yml'));
  assert.ok(fs.existsSync('.github/ISSUE_TEMPLATE/history-note.yml'));
});

test('fix: sources cannot be edited; item About is required', () => {
  rejects('fix', { field: 'sources' }, /"sources" cannot be changed/);
  rejects('item', { about: null }, /"About" is required/);
});

test('values prefilled by the What is missing panel parse: typed fix record, split copy ids', () => {
  const fix = submit('fix', { record: 'match:fixture-league/ro8-a-1', field: 'format', new_value: 'Bo5' });
  assert.ok(fix.out.file.endsWith('matches/fixture-league/ro8-a-1.yaml'));
  const copy = submit('copy', { event_id: 'fixture-league', match_id: 'ro8-a-2', game_number: '1' });
  assert.ok(copy.out.file.endsWith('matches/fixture-league/ro8-a-2.yaml'));
});

test('copy form field ids never collide with GitHub prefill params (title, labels, template)', () => {
  for (const [kind, form] of Object.entries(FORMS)) {
    if (kind === 'item') continue; // item form is never prefilled from the site
    for (const f of form.fields) assert.ok(!['title', 'labels', 'template', 'assignees', 'projects', 'milestone'].includes(f.id), `${kind}.${f.id}`);
  }
});
