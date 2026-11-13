// Manual e2e for /events/ + /series/ against the FIXTURE catalog:
//   CATALOG_DIR=test/fixtures/catalog npm run build && npm run preview &
//   node test/e2e-events.cjs   (SITE_URL, OUT optional)
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const { parse } = require('yaml');

// Expected values come from the fixture catalog, never hardcoded.
const FIX = path.join(__dirname, 'fixtures/catalog');
const loadAll = (dir) => fs.readdirSync(path.join(FIX, dir)).map((f) => parse(fs.readFileSync(path.join(FIX, dir, f), 'utf8')));
const events = loadAll('events');
const bigEvents = events.filter((e) => e.tier === 'big');
const cupEvents = events.filter((e) => e.kind === 'cup');
const seriesEvents = events.filter((e) => e.series === 'fixture-series');
const bigYears = new Set(bigEvents.map((e) => e.year));
const nonBigOnlyYear = events.map((e) => e.year).find((y) => !bigYears.has(y));

const base = (process.env.SITE_URL || 'http://localhost:4321/broodwar-archive/').replace(/\/?$/, '/');
const out = process.env.OUT || path.join(require('node:os').tmpdir(), 'bw-events-screens');
const fail = (msg) => { console.log('FAIL', msg); process.exitCode = 1; };

async function noOverflow(page, label) {
  const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth }));
  console.log(label, 'scrollWidth', sw, 'innerWidth', iw);
  if (sw > iw) fail(`${label} overflows`);
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  for (const [name, w, h] of [['375', 375, 812], ['1280', 1280, 800]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    const errors = [];
    page.on('console', (m) => m.type() === 'error' && !/fonts\.g|net::ERR/.test(m.text()) && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(String(e)));

    await page.goto(`${base}events/`);
    const rows = page.locator('.frow:visible');
    const total = await rows.count();
    await page.screenshot({ path: `${out}/events-${name}.png`, fullPage: true });
    await noOverflow(page, `events ${name}`);

    await page.click('#f-tier button[data-tier="big"]');
    const big = await rows.count();
    console.log(name, 'events', total, '-> tier=big', big, await page.textContent('#ev-count'));
    if (!(big > 0 && big < total)) fail('tier filter did not narrow');
    await page.screenshot({ path: `${out}/events-big-${name}.png`, fullPage: true });
    await noOverflow(page, `events filtered ${name}`);

    await page.focus('#f-kind');
    await page.screenshot({ path: `${out}/events-focus-${name}.png` });
    await page.selectOption('#f-year', String(nonBigOnlyYear)); // tier=big is still on and no big event is in that year
    if (!(await page.isVisible('#ev-none'))) fail('no-matches message not visible');
    await page.click('#ev-none-reset');
    if ((await rows.count()) !== total) fail('reset did not restore');

    await page.click('#f-tier button[data-tier="big"]');
    await rows.first().locator('a').first().click();
    await page.waitForURL(/\/events\/[^/]+\/$/);
    const openedId = page.url().split('/').filter(Boolean).pop();
    if (!bigEvents.some((e) => e.id === openedId)) fail(`first big row opened ${openedId}, not a big fixture event`);
    console.log(name, 'opened', await page.textContent('h1'));

    await page.goBack();
    await page.click('#f-reset');
    await page.selectOption('#f-kind', 'cup');
    await page.click(`a[href$="events/${cupEvents[0].id}/"]`);
    await page.goBack();
    const shown = await rows.count();
    const kindNow = await page.inputValue('#f-kind');
    console.log(name, 'after Back: kind', kindNow, 'rows', shown);
    if (shown !== (kindNow === 'cup' ? cupEvents.length : total)) fail('restored select disagrees with list');
    await page.goto(`${base}series/fixture-series/`);
    const seriesCount = await page.locator('.events a').count();
    console.log(name, 'series events', seriesCount);
    if (seriesCount !== seriesEvents.length) fail(`series page lists ${seriesCount}, want ${seriesEvents.length}`);
    await page.screenshot({ path: `${out}/series-${name}.png`, fullPage: true });
    await noOverflow(page, `series ${name}`);

    console.log(name, 'console errors', errors);
    if (errors.length) process.exitCode = 1;
  }
  await browser.close();
})();
