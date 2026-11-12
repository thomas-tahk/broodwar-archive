// Manual e2e against the REAL catalog (default build). Local: npm run build && npm run preview, then
//   node test/e2e-screens.cjs
// Live preview: SITE_URL=https://thomas-tahk.github.io/broodwar-archive/m1-site/ OUT=/some/dir node test/e2e-screens.cjs
const { chromium } = require('playwright');
const fs = require('node:fs');

const base = (process.env.SITE_URL || 'http://localhost:4321/broodwar-archive/').replace(/\/?$/, '/');
const out = process.env.OUT || 'docs/milestones/m2-screens';

async function overflow(page, label, width) {
  const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth }));
  console.log(label, width, 'scrollWidth', sw, 'innerWidth', iw);
  if (sw > iw) process.exitCode = 1;
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  for (const [name, w, h] of [['375', 375, 812], ['1280', 1280, 800]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    const errors = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(String(e)));

    await page.goto(base);
    await page.screenshot({ path: `${out}/home-${name}.png`, fullPage: true });
    await overflow(page, 'home', name);
    const leagues = await page.locator('nav[aria-label="Leagues"] a[href*="/series/"]').count();
    const bands = await page.locator('.years a.band').count();
    console.log(name, 'league links', leagues, 'timeline bands', bands);
    if (!(leagues > 0 && bands > 0)) process.exitCode = 1;
    await page.click('.years a.band');
    await page.waitForURL('**/events/**');
    await page.screenshot({ path: `${out}/event-${name}.png`, fullPage: true });
    await overflow(page, 'event', name);
    await page.click('.tabs button:has-text("Ro16")');
    console.log(name, 'Ro16 rows visible', await page.locator('.season .panel:not([hidden]) .row').count());

    await page.click('a.btn');
    await page.waitForURL('**/matches/**');
    await page.waitForSelector('section.game:not([hidden]) iframe[src*="youtube-nocookie.com/embed/"]');
    await page.screenshot({ path: `${out}/match-${name}.png`, fullPage: true });
    await overflow(page, 'match', name);
    await page.click('.gs button:nth-child(2)');
    await page.waitForSelector('section.game:not([hidden])[data-game="2"] iframe[src*="youtube-nocookie"]');
    await page.click('section.game:not([hidden]) .cp button:nth-child(2)');
    console.log(name, 'copy 2 src', await page.getAttribute('section.game:not([hidden]) iframe', 'src'));

    await page.goto(`${base}find/`);
    const total = await page.locator('.frow:not([hidden])').count();
    await page.click('.mx button[data-mu="PT"]');
    const filtered = await page.locator('.frow:not([hidden])').count();
    console.log(name, 'find rows', total, '-> PvT', filtered, await page.textContent('#count'));
    if (!(filtered > 0 && filtered < total)) process.exitCode = 1;
    await page.screenshot({ path: `${out}/find-${name}.png`, fullPage: true });
    await overflow(page, 'find', name);
    await page.click('.mx button[data-mu="PT"]');
    if ((await page.locator('.frow:not([hidden])').count()) !== total) process.exitCode = 1;

    console.log(name, 'console errors', errors);
    if (errors.length) process.exitCode = 1;
  }
  await browser.close();
})();
