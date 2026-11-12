import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadCatalog } from '../tools/catalog/load.js';
import { bestGrade } from '../tools/catalog/grades.js';

const FIXTURE = 'test/fixtures/catalog';
const BASE = '/broodwar-archive/';
// Own outDir (never the repo's dist/); every temp dir is removed in after().
const tmpDirs = [];
const tmp = (prefix) => { const d = fs.mkdtempSync(path.join(os.tmpdir(), prefix)); tmpDirs.push(d); return d; };
let outDir;
after(() => { for (const d of tmpDirs) fs.rmSync(d, { recursive: true, force: true }); });
const read = (p) => fs.readFileSync(`${outDir}/${p}/index.html`, 'utf8');
const build = (catalogDir) => {
  outDir = tmp('bw-out-');
  execSync(`npm run build -- --outDir ${outDir}`, { env: { ...process.env, CATALOG_DIR: catalogDir }, stdio: 'pipe' });
};
const copyFixture = () => {
  const dir = tmp('bw-cat-');
  fs.cpSync(FIXTURE, dir, { recursive: true });
  return dir;
};
const has = (html, text) => assert.ok(html.includes(text), `missing: ${text}`);
const esc = (s) => s.replace(/&/g, '&amp;');

const cat = loadCatalog(FIXTURE);
const mapsById = new Map(cat.maps.map((m) => [m.id, m]));
const playersById = new Map(cat.players.map((p) => [p.id, p]));

test('fixture catalog renders everything it knows', async (t) => {
  build(FIXTURE);

  await t.test('footer links to the repo on every page', () => {
    const pages = ['', ...cat.events.map((e) => `events/${e.id}`), ...cat.matches.map((m) => `matches/${m.event}/${m.id}`)];
    for (const p of pages) {
      const html = read(p);
      has(html, 'href="https://github.com/thomas-tahk/broodwar-archive/blob/main/CONTRIBUTING.md"');
      has(html, 'Help fill the gaps');
      has(html, 'href="https://github.com/thomas-tahk/broodwar-archive"');
      has(html, 'Source on GitHub');
    }
  });

  await t.test('home links every event under base', () => {
    const html = read('');
    for (const e of cat.events) has(html, `href="${BASE}events/${e.id}/"`);
  });

  await t.test('event page links every match, shows per-game best grade and sources', () => {
    for (const e of cat.events) {
      const html = read(`events/${e.id}`);
      for (const s of e.sources) { has(html, s.url); if (s.note) has(html, s.note); }
      for (const u of Object.values(e.field_sources ?? {})) has(html, u);
      for (const m of cat.matches.filter((x) => x.event === e.id)) {
        const row = html.split(`class="row" href="${BASE}matches/${m.event}/${m.id}/"`)[1]?.split('</a>')[0];
        assert.ok(row, `no link for ${m.fullId}`);
        const n = m.games.reduce((k, g) => k + g.copies.length, 0);
        assert.ok(row.includes(n ? `${n} video` : 'No video known'), `${m.fullId} video count`);
      }
    }
  });

  await t.test('match pages show every copy, grade, detail and source', () => {
    for (const m of cat.matches) {
      const html = read(`matches/${m.event}/${m.id}`);
      for (const s of m.sources) { has(html, s.url); if (s.note) has(html, s.note); }
      for (const u of Object.values(m.field_sources ?? {})) has(html, u);
      for (const id of m.players.filter(Boolean)) {
        const pl = playersById.get(id);
        for (const s of pl.sources) { has(html, s.url); if (s.note) has(html, s.note); }
        for (const u of Object.values(pl.field_sources ?? {})) has(html, u);
      }
      const games = html.split('<section class="game"').slice(1);
      assert.equal(games.length, m.games.length);
      m.games.forEach((g, gi) => {
        const want = bestGrade(g) ?? 'none';
        assert.match(games[gi].split('</header>')[0], new RegExp(`data-grade="${want}"`));
        if (g.map) {
          const mp = mapsById.get(g.map);
          for (const s of mp.sources) { has(html, s.url); if (s.note) has(html, s.note); }
          for (const u of Object.values(mp.field_sources ?? {})) has(html, u);
        }
        const copies = games[gi].split('<li class="copy">').slice(1);
        assert.equal(copies.length, g.copies.length, `${m.fullId} g${g.set} copy count`);
        g.copies.forEach((c, ci) => {
          const chunk = copies[ci];
          has(chunk, esc(c.url));
          assert.match(chunk, new RegExp(`data-grade="${c.grade ?? 'none'}"`));
          for (const v of [{ 'fan-upload': 'Fan upload', 'ogn-ai-upscale': 'AI upscale', 'ogn-official': 'Original broadcast', torrent: 'Torrent', other: 'Other copy' }[c.kind] ?? c.kind, c.title, c.uploader, c.resolution, c.grade_note].filter(Boolean)) has(chunk, v);
          if (c.fps != null) has(chunk, `${c.fps} fps`);
          if (c.segment) { has(chunk, c.segment.start); has(chunk, c.segment.end); }
          has(chunk, 'Watch on example.com');
          has(chunk, 'rel="noopener noreferrer"');
        });
      });
    }
  });

  await t.test('lost game shows X and lost text', () => {
    const html = read('matches/fixture-league/final');
    has(html, 'Footage known lost.');
    assert.match(html, /data-grade="X"/);
  });

  await t.test('game with no copy and null fields says so plainly', () => {
    const html = read('matches/fixture-league/ro8-a-2');
    has(html, 'No copy known.');
    has(html, 'Date: Unknown');
    has(html, 'Map: Unknown');
    has(html, 'Winner: Unknown');
    has(html, 'Result: Unknown');
  });

  await t.test('races are only shown when known', () => {
    const html = read('matches/fixture-league/final');
    has(html, 'Terran');
    has(html, 'Zerg');
    has(html, 'Race unknown');
    has(html, 'https://example.com/players/alpha-hangul');
    has(html, '알파');
  });
});

test('score that is not N-N is shown raw; build fails on bad catalog', () => {
  const dir = copyFixture();
  const file = path.join(dir, 'matches/fixture-league/final.yaml');
  const original = fs.readFileSync(file, 'utf8');
  fs.writeFileSync(file, original.replace('score: "1-2"', 'score: "walkover"'));
  build(dir);
  has(read('matches/fixture-league/final'), 'walkover');

  fs.writeFileSync(file, original.replace('https://example.com/video/fan-final', 'javascript:alert(1)'));
  assert.throws(() => build(dir));
});

test('build succeeds with an explicit empty catalog dir', () => {
  build(tmp('bw-empty-'));
  has(read(''), 'No events');
});

test('real catalog: Find page, race matrix and embedded player', async (t) => {
  const real = loadCatalog('catalog');
  const games = real.matches.flatMap((m) => m.games);
  build('catalog');

  await t.test('Find page lists every game and is linked from the header', () => {
    const html = read('find');
    assert.equal((html.match(/<li class="frow"/g) ?? []).length, games.length);
    assert.equal(games.length, 64);
    has(html, `href="${BASE}find/"`);
    has(read(''), `href="${BASE}find/"`);
  });

  await t.test('matrix has 6 distinct matchups summing to games with known races', () => {
    const html = read('find');
    const cells = [...html.matchAll(/<button type="button" data-mu="([A-Z]{2})"[^>]*aria-label="[^"]*, (\d+) games"/g)];
    assert.equal(cells.length, 9);
    const byKey = new Map(cells.map((c) => [c[1], Number(c[2])]));
    assert.equal(byKey.size, 6);
    const known = games.filter((g) => g.races?.every((r) => ['T', 'P', 'Z'].includes(r))).length;
    assert.equal([...byKey.values()].reduce((a, b) => a + b, 0), known);
  });

  await t.test('match page embeds a youtube-nocookie player', () => {
    has(read('matches/2001-sky-osl/final'), 'https://www.youtube-nocookie.com/embed/MRsg5nqqmLU');
    has(read('matches/2001-sky-osl/final'), 'Open on YouTube');
  });
});
