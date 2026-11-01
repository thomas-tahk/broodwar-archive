# Brood War Archive

A public, community catalog of every surviving copy of televised Korean StarCraft: Brood War broadcasts. Each copy is graded for quality, and the gaps (matches with no good copy) are made visible.

We **link only. We never host video.**

First event: **2001 SKY OSL**.

Site: https://thomas-tahk.github.io/broodwar-archive/

Want to add or fix something? You don't need to code. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Layout

- `catalog/` - the data: plain YAML files for events, matches, players, maps
- `docs/` - catalog format (`docs/catalog-format.md`), design spec, plans
- `tools/` - the validator that checks every catalog file
- `site/` - the website, built from the catalog
- `.github/` - issue forms and automatic checks

## Local dev

```
npm install
npm run validate
npm run dev
```
