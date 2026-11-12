// Manual e2e against the REAL catalog (default build). Local: npm run build && npm run preview, then
//   node test/e2e-screens.cjs
// Live preview: SITE_URL=https://thomas-tahk.github.io/broodwar-archive/m1-site/ OUT=/some/dir node test/e2e-screens.cjs
const { chromium } = require('playwright');
const fs = require('node:fs');

const base = (process.env.SITE_URL || 'http://localhost:4321/broodwar-archive/').replace(/\/?$/, '/');
const out = process.env.OUT || require('node:path').join(require('node:os').tmpdir(), 'bw-screens'); // OUT=docs/milestones/m2-screens to refresh the committed shots

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
    await page.click('.years a.band[href*="2001-sky-osl"]');
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
    await page.waitForSelector('#ui:not([hidden]) .frow');
    const total = await page.locator('.frow').count();
    await page.click('#f-league button[data-value="osl"]');
    await page.click('#f-year button[data-value="2001"]');
    const shownLeague = Number(await page.getAttribute('#f-league button[data-value="osl"]', 'data-count'));
    const shownYear = Number(await page.getAttribute('#f-year button[data-value="2001"]', 'data-count'));
    const countText = await page.textContent('#count');
    const rows = (await page.locator('.frow').count()) + (await page.isVisible('#more') ? 1 : 0);
    console.log(name, 'find total', total, '-> OSL+2001 rows', rows, 'chip counts', shownLeague, shownYear, countText, page.url());
    if (!(rows > 0 && countText.startsWith(`${shownLeague} `) && shownLeague === shownYear && rows === shownLeague)) process.exitCode = 1;
    await page.screenshot({ path: `${out}/find-${name}.png`, fullPage: true });
    await overflow(page, 'find', name);
    await page.focus('#q');
    await page.screenshot({ path: `${out}/find-focus-${name}.png` });
    await page.goto(page.url());
    await page.waitForSelector('#ui:not([hidden]) .frow');
    console.log(name, 'shared link reload', await page.textContent('#count'));
    await page.click('#clear');
    for (const sel of ['#f-map button:not([disabled])', '.mx button[data-value="PT"]']) {
      const chip = page.locator(sel).first();
      const chipCount = Number(await chip.getAttribute('data-count'));
      await chip.click();
      const n = (await page.locator('.frow').count()) + ((await page.isVisible('#more')) ? 1 : 0);
      console.log(name, 'narrowing', sel, 'chip', chipCount, 'results', await page.textContent('#count'));
      if (!(chipCount < total && (await page.textContent('#count')).startsWith(`${chipCount} `) && n > 0)) process.exitCode = 1;
      await page.click('#clear');
    }
    if ((await page.locator('.frow').count()) !== total) process.exitCode = 1;

    // Player and map pages: every page linked from the index must fit the viewport.
    for (const kind of ['players', 'maps']) {
      await page.goto(`${base}${kind}/`);
      await overflow(page, `${kind} index`, name);
      await page.screenshot({ path: `${out}/${kind}-${name}.png`, fullPage: true });
      const links = await page.locator('a.row').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
      if (!links.length) process.exitCode = 1;
      for (const link of links) {
        await page.goto(new URL(link, page.url()).href);
        await overflow(page, link, name);
      }
    }

    // What's missing panel on a stub/partial event (issue #16).
    await page.goto(`${base}events/2002-kpga-1st-tour/`);
    const panel = page.locator('section.missing');
    const help = panel.locator('a', { hasText: 'Help fill this' });
    const panelOk = (await panel.isVisible()) && (await panel.textContent()).includes("What's missing");
    const helpUrl = new URL((await help.getAttribute('href')) ?? 'http://none/');
    console.log(name, 'missing panel visible', panelOk, 'help link', helpUrl.searchParams.get('template'), helpUrl.searchParams.get('record'));
    if (!(panelOk && helpUrl.searchParams.get('template') === 'submit-fix.yml' && helpUrl.searchParams.get('record') === 'event:2002-kpga-1st-tour')) process.exitCode = 1;
    const box = await help.boundingBox();
    if (!box || box.height < 44) process.exitCode = 1;
    await overflow(page, 'event missing panel', name);
    await page.screenshot({ path: `${out}/event-missing-${name}.png`, fullPage: true });

    console.log(name, 'console errors', errors);
    if (errors.length) process.exitCode = 1;
  }
  await browser.close();
})();
