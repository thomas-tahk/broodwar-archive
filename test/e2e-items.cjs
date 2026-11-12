// Manual e2e against the REAL catalog: open an item page from a player page at 375 and 1280.
// Local: npm run build && npm run preview, then  SITE_URL=http://localhost:4321/broodwar-archive/ node test/e2e-items.cjs
const { chromium } = require('playwright');
const fs = require('node:fs');

const base = (process.env.SITE_URL || 'http://localhost:4321/broodwar-archive/').replace(/\/?$/, '/');
const out = process.env.OUT || 'docs/milestones/m2-screens';

async function openItemFromAPlayer(page) {
  await page.goto(`${base}players/`);
  const links = await page.locator('a.row').evaluateAll((as) => as.map((a) => a.href));
  for (const link of links) {
    await page.goto(link);
    const row = page.locator('ul.items a').first();
    if (!(await row.count())) continue;
    await row.click();
    await page.waitForURL('**/items/**');
    return true;
  }
  return false;
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  for (const [name, w, h] of [['375', 375, 812], ['1280', 1280, 800]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    const errors = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(String(e)));

    const opened = await openItemFromAPlayer(page);
    const outbound = await page.locator('a[target="_blank"][rel="noopener noreferrer"][href^="http"]').count();
    const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth }));
    const small = await page.locator('main a, .items a').evaluateAll((as) => as.filter((a) => a.getBoundingClientRect().height < 44 && a.closest('.items')).length);
    console.log(name, 'opened', opened, page.url(), 'h1', opened && (await page.textContent('h1')));
    console.log(name, 'external links', outbound, 'scrollWidth', sw, 'innerWidth', iw, 'item links under 44px', small, 'console errors', errors);
    await page.screenshot({ path: `${out}/item-${name}.png`, fullPage: true });
    if (!opened || outbound < 1 || sw > iw || small || errors.length) process.exitCode = 1;
    await page.close();
  }
  await browser.close();
})();
