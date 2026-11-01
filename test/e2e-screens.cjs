// Manual e2e: CATALOG_DIR=test/fixtures/catalog npm run build && npm run preview, then node test/e2e-screens.cjs
const { chromium } = require('playwright');
const fs = require('node:fs');

const base = process.env.SITE_URL || 'http://localhost:4321/broodwar-archive/';
const out = 'docs/milestones/m1-screens';

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  for (const [name, w, h] of [['390', 390, 844], ['1280', 1280, 800]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    const errors = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(base);
    await page.screenshot({ path: `${out}/site-home-${name}.png`, fullPage: true });
    await page.click('a[href$="/events/fixture-league/"]');
    await page.waitForURL('**/events/fixture-league/');
    await page.screenshot({ path: `${out}/site-event-${name}.png`, fullPage: true });
    await page.screenshot({ path: `${out}/gap-${name}.png`, fullPage: true });
    const ev = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
    console.log(name, 'event page scrollWidth', ev[0], 'innerWidth', ev[1]);
    if (ev[0] > ev[1]) process.exitCode = 1;
    await page.click('a[href$="/matches/fixture-league/final/"]');
    await page.waitForURL('**/matches/fixture-league/final/');
    await page.screenshot({ path: `${out}/site-match-${name}.png`, fullPage: true });
    const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth }));
    console.log(name, 'scrollWidth', sw, 'innerWidth', iw, 'console errors', errors);
    if (sw > iw) process.exitCode = 1;
  }
  await browser.close();
})();
