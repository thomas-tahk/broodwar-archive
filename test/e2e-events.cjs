// Manual e2e for /events/ + /series/ against the FIXTURE catalog:
//   CATALOG_DIR=test/fixtures/catalog npm run build && npm run preview &
//   node test/e2e-events.cjs   (SITE_URL, OUT optional)
const { chromium } = require('playwright');
const fs = require('node:fs');

const base = (process.env.SITE_URL || 'http://localhost:4321/broodwar-archive/').replace(/\/?$/, '/');
const out = process.env.OUT || 'docs/milestones/m2-events-screens';
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
    const rows = page.locator('.frow:not([hidden])');
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
    await page.selectOption('#f-year', '2000'); // tier=big is still on and the big event is 2001
    if (!(await page.isVisible('#ev-none'))) fail('no-matches message not visible');
    await page.click('#ev-none-reset');
    if ((await rows.count()) !== total) fail('reset did not restore');

    await page.click('#f-tier button[data-tier="big"]');
    await rows.first().locator('a').first().click();
    await page.waitForURL('**/events/fixture-big-2001/');
    console.log(name, 'opened', await page.textContent('h1'));

    await page.goBack();
    await page.click('#f-reset');
    await page.selectOption('#f-kind', 'cup');
    await page.click('a[href$="events/fixture-league/"]');
    await page.goBack();
    const shown = await rows.count();
    const kindNow = await page.inputValue('#f-kind');
    console.log(name, 'after Back: kind', kindNow, 'rows', shown);
    if (kindNow === 'cup' && shown !== 1) fail('restored select disagrees with list');
    await page.goto(`${base}series/fixture-series/`);
    const seriesCount = await page.locator('.events a').count();
    console.log(name, 'series events', seriesCount);
    if (seriesCount !== 2) fail(`series page lists ${seriesCount}, want 2`);
    await page.screenshot({ path: `${out}/series-${name}.png`, fullPage: true });
    await noOverflow(page, `series ${name}`);

    console.log(name, 'console errors', errors);
    if (errors.length) process.exitCode = 1;
  }
  await browser.close();
})();
