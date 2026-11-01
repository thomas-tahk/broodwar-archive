# Brood War Archive

A public, community catalog of every surviving copy of televised Korean StarCraft: Brood War broadcasts. Each copy is graded for quality, and the gaps (matches with no good copy) are made visible.

We **link only. We never host video.**

First event: **2001 SKY OSL**.

Site: https://thomas-tahk.github.io/broodwar-archive/

Want to add or fix something? You don't need to code. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Layout

- `catalog/` - the data: YAML for events, matches, players, maps; schemas in `catalog/schema/`
- `tools/catalog/` - the validator that checks every catalog file
- `src/`, `astro.config.mjs` - the website, built from the catalog
- `docs/` - catalog format (`docs/catalog-format.md`), design spec, plans
- `.github/` - issue forms and CI workflows (`.github/workflows/`)

## Local dev

```
npm install
npm run validate
npm run dev
```

Other scripts: `npm test`, `npm run build`, `npm run preview`. Optional: `node test/e2e-screens.cjs` takes screenshots (needs Playwright installed globally).
