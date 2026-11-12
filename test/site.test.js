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
      has(html, `href="${BASE}help-wanted/"`);
      for (const k of ["events", "players", "maps", "help-wanted"]) has(html, `href="${BASE}${k}/"`);
      has(html, 'Help fill the gaps');
      has(html, 'href="https://github.com/thomas-tahk/broodwar-archive"');
      has(html, 'Source on GitHub');
    }
  });

  await t.test('home is a front door: league menu, featured, timeline, latest', () => {
    const html = read('');
    has(html, `<a href="${BASE}series/fixture-series/">Fixture Series</a>`);
    has(html, 'Featured');
    has(html, 'Fixture blurb');
    has(html, '<h3>2002</h3>');
    has(html, '<h3>2000</h3>');
    assert.ok(html.indexOf('<h3>2002</h3>') < html.indexOf('<h3>2000</h3>'), 'years descend');
    has(html, `class="band" href="${BASE}events/fixture-big-2002/"`);
    has(html, 'Latest additions');
    const section = html.split('id="years-h"')[1].split('</section>')[0];
    const entries = [...section.matchAll(/<a [^>]*>/g)].map((m) => m[0]);
    assert.ok(entries.length >= 4);
    for (const a of entries) assert.match(a, /href="[^"]+"/);
  });

  await t.test('home links every event under base', () => {
    const html = read('');
    for (const e of cat.events) has(html, `href="${BASE}events/${e.id}/"`);
  });

  await t.test('series page groups seasons by year, newest first, with tier and completeness', () => {
    const html = read('series/fixture-series');
    has(html, 'Fixture Series');
    for (const e of cat.events.filter((x) => x.series === 'fixture-series')) {
      has(html, `href="${BASE}events/${e.id}/"`);
      has(html, e.name);
    }
    assert.ok(!html.includes('fixture-oneoff'), 'one-off event must not be on the series page');
    const [i2001, i2000] = [html.indexOf('>2001<'), html.indexOf('>2000<')];
    assert.ok(i2001 >= 0 && i2000 >= 0 && i2001 < i2000, 'both years present, newest first');
    has(html, 'Big tier');
    has(html, 'Stub');
    has(html, '0 matches recorded');
  });

  await t.test('events page lists every event (stubs too) with filter controls and completeness', () => {
    const html = read('events');
    for (const e of cat.events) {
      has(html, `href="${BASE}events/${e.id}/"`);
      has(html, `data-tier="${e.tier}" data-kind="${e.kind}" data-year="${e.year}"`);
    }
    for (const id of ['f-kind', 'f-year', 'f-series', 'f-reset']) has(html, `id="${id}"`);
    has(html, 'data-tier="big" aria-pressed="false"');
    for (const w of ['Stub', 'Partial', 'Complete']) has(html, `>${w}<`);
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

  await t.test('player page lists games from every event, newest event first, with result and best grade', () => {
    const html = read('players/alpha');
    const groups = [...html.matchAll(/<section class="evgroup" aria-label="([^"]+)"/g)].map((m) => m[1]);
    // Same-year events order by latest match date (zeta 2001-09 > cup 2001-03), not by id.
    // An undated event from a later year (2002) still comes first: year wins over date.
    assert.deepEqual(groups, ['Fixture Future 2002', 'Fixture Zeta 2001','Fixture Cup 2001', 'Fixture League 2000']);
    has(html, `href="${BASE}matches/fixture-cup/semi/"`);
    has(html, `href="${BASE}matches/fixture-league/final/"`);
    has(html, `href="${BASE}matches/fixture-league/ro8-a-1/"`);
    has(html, 'Games (8)');
    const rows = html.split('<li class="grow">').slice(1);
    const rowOf = (href) => rows.find((r) => r.includes(`href="${BASE}${href}/"`));
    assert.match(rowOf('matches/fixture-cup/semi'), /<b>Loss<\/b>[\s\S]*data-grade="C"/);
    assert.match(rowOf('matches/fixture-league/ro8-a-1'), /<b class="win">Win<\/b>[\s\S]*data-grade="A"/);
    assert.match(html, /<b>Loss<\/b>\s*<span class="grade" data-grade="X">Footage lost/);
    assert.ok(!html.includes('Won') && !html.includes('Lost'));
    // Undated row sorts last inside its event; unknown opponent is plain text, not a link.
    const zeta = html.split('<section class="evgroup"')[2];
    assert.ok(zeta.indexOf('2001.09.01') < zeta.indexOf('Date unknown'), 'undated last');
    const tbd = rowOf('matches/fixture-zeta/tbd');
    has(tbd, 'vs Unknown');
    has(tbd, 'Result unknown');
    assert.ok(!/vs <a/.test(tbd), 'unknown opponent not linked');
    has(tbd, 'Map unknown');
    has(html, 'Fixture interview');
    has(html, 'https://example.com/players/alpha');
  });

  await t.test('map page lists its games and items; sparse pages say so', () => {
    const two = read('maps/map-two');
    has(two, `href="${BASE}matches/fixture-cup/semi/"`);
    has(two, `href="${BASE}matches/fixture-league/final/"`);
    has(two, `href="${BASE}players/alpha/"`);
    has(two, 'Games (2)');
    has(two, 'No items linked yet');
    has(read('maps/map-one'), 'Fixture interview');
    has(read('maps/map-three'), 'No games recorded on this map yet.');
    has(read('players/delta'), 'No games recorded for this player yet.');
  });

  await t.test('index pages list everyone; match page links player and map', () => {
    const pl = read('players');
    for (const p of cat.players) has(pl, `href="${BASE}players/${p.id}/"`);
    const mp = read('maps');
    for (const m of cat.maps) has(mp, `href="${BASE}maps/${m.id}/"`);
    const html = read('matches/fixture-league/final');
    has(html, `href="${BASE}players/alpha/"`);
    has(html, `href="${BASE}maps/map-one/"`);
    has(read('matches/fixture-league/ro8-a-2'), 'Map: Unknown');
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

test('featured match card reads "<p1> vs <p2> · <event name>"', () => {
  const dir = copyFixture();
  fs.writeFileSync(path.join(dir, 'featured.yaml'), 'featured:\n  - ref: match:fixture-league/final\n');
  build(dir);
  has(read(''), 'Alpha vs Charlie · Fixture League 2000');
});

test('sparse home: featured hidden, undated item under "Year unknown" last, help panel shown', () => {
  const dir = copyFixture();
  fs.writeFileSync(path.join(dir, 'featured.yaml'), 'featured: []\n');
  fs.writeFileSync(path.join(dir, 'items/undated.yaml'), [
    'id: undated', 'kind: article', 'title: Undated piece', 'date: null', 'language: null',
    'urls: [https://example.com/undated]', 'links:', '  about: [player:alpha]',
    'sources: [{url: "https://example.com/undated"}]', ''].join('\n'));
  build(dir);
  const html = read('');
  assert.ok(!html.includes('id="featured-h"'), 'featured section hidden');
  has(html, 'Year unknown');
  assert.ok(html.indexOf('<h3>2000</h3>') < html.indexOf('Year unknown'), 'unknown year last');
  has(html, `href="${BASE}items/undated/"`);
  has(html, 'Help build the archive');
  has(html, `href="${BASE}help-wanted/"`);
});

test('build succeeds with an explicit empty catalog dir', () => {
  build(tmp('bw-empty-'));
  has(read(''), 'No events');
});

test('empty catalog: /events/ shows the empty state and no filter form', () => {
  build(tmp('bw-empty-'));
  const html = read('events');
  has(html, 'No events in the archive yet');
  assert.ok(!html.includes('id="f-kind"'), 'no filters when there are no events');
});

test('real catalog: Find page, race matrix and embedded player', async (t) => {
  const real = loadCatalog('catalog');
  const games = real.matches.flatMap((m) => m.games);
  build('catalog');

  await t.test('Find page shell is linked from the header and points at the prebuilt list', () => {
    const html = read('find');
    has(html, `data-json="${BASE}find/records.json"`);
    has(html, 'id="q"');
    has(read(''), `href="${BASE}find/"`);
  });

  await t.test('records.json lists every game, matchups sum to games with known races', () => {
    const { records, labels } = JSON.parse(fs.readFileSync(`${outDir}/find/records.json`, 'utf8'));
    const gameRecs = records.filter((r) => r.kind === 'game');
    assert.equal(gameRecs.length, games.length);
    assert.equal(games.length, 64);
    const known = games.filter((g) => g.races?.every((r) => ['T', 'P', 'Z'].includes(r))).length;
    assert.equal(gameRecs.filter((r) => r.matchup).length, known);
    assert.equal(new Set(gameRecs.map((r) => r.matchup).filter(Boolean)).size, 6);
    assert.equal(labels.league.osl, 'OnGameNet StarLeague');
  });

  await t.test('match page embeds a youtube-nocookie player', () => {
    has(read('matches/2001-sky-osl/final'), 'https://www.youtube-nocookie.com/embed/MRsg5nqqmLU');
    has(read('matches/2001-sky-osl/final'), 'Open on YouTube');
  });
});

test('help-wanted page lists every gap with a record link and a prefilled form link', async (t) => {
  const dir = copyFixture();
  const edit = (f, from, to) => { const p = `${dir}/${f}`; fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace(from, to)); };
  edit('events/fixture-league.yaml', 'completeness: complete', 'completeness: partial');
  edit('matches/fixture-league/ro8-a-1.yaml', 'completeness: complete', 'completeness: stub');
  build(dir);
  const html = read('help-wanted');
  const unesc = (s) => s.replace(/&#38;|&amp;/g, '&');
  const rows = (html.match(/<li class="helprow"[\s\S]*?<\/li>/g) ?? []).map((r) => ({
    record: r.match(/data-record="([^"]+)"/)[1],
    href: r.match(/class="row" href="([^"]+)"/)[1],
    form: new URL(unesc(r.match(/class="helpbtn" href="([^"]+)"/)[1])),
  }));

  await t.test('counts at top are pinned', () => {
    const counts = { event: 8, match: 1, nocopy: 4, nofields: 3 }; // + home and series fixture events
    for (const [k, n] of Object.entries(counts)) has(html, `data-gap="${k}" data-count="${n}"`);
    assert.equal(rows.length, 16);
  });

  await t.test('each row links to its own record and prefills the form', () => {
    const byKey = (rec, tmpl) => rows.find((r) => r.record === rec && r.form.searchParams.get('template') === tmpl);
    assert.equal(byKey('fixture-league', 'submit-fix.yml').href, `${BASE}events/fixture-league/`);
    assert.equal(byKey('fixture-league/ro8-a-1', 'submit-fix.yml').href, `${BASE}matches/fixture-league/ro8-a-1/`);
    const own = rows.filter((r) => r.record === 'fixture-league/ro8-a-2');
    assert.equal(own.length, 2); // no-copy row + missing-fields row
    for (const r of own) assert.equal(r.href, `${BASE}matches/fixture-league/ro8-a-2/`);
    const copy = byKey('fixture-league/ro8-a-2', 'submit-copy.yml');
    assert.equal(copy.form.searchParams.get('match_id'), 'fixture-league/ro8-a-2');
    assert.equal(copy.form.searchParams.get('title'), '[fixture-league/ro8-a-2] ');
    const info = byKey('fixture-league/ro8-a-2', 'submit-fix.yml');
    assert.equal(info.form.searchParams.get('record'), 'fixture-league/ro8-a-2');
    assert.equal(info.form.searchParams.get('title'), '[fixture-league/ro8-a-2] ');
    for (const r of rows) assert.equal(r.form.origin + r.form.pathname, 'https://github.com/thomas-tahk/broodwar-archive/issues/new');
  });
});
