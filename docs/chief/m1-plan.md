# M1 — Public catalog site (approved 2026-11-01)

Owner's ask: a presentable front end, deployed ASAP, that people can start seeing and that many kinds of people can contribute to. Restoration (spec §7) waits until after M1.

**Done-gate:** I open the public GitHub Pages URL on my phone, open the 2001 SKY OSL event, pick a match, and see every known copy of it with a quality grade and a working link; the gap view shows which matches have no good copy.

**Event:** 2001 SKY OSL (OGN). Chosen over KPGA 2002 (next event) and recent ASL (clean official copies leave nothing to grade).

## Issues
1. **Catalog schema + validator** — spec §5 data model as plain files (one per match / event / player / map); validator CLI; CI fails on a bad file. Done check: validator passes on the real data, a deliberately broken file fails.
2. **2001 SKY OSL catalogued** — every match of the event: players, races, map, date, round, result; every known copy (OGN official YouTube, OGN AI upscale, fan uploads/torrents) with source link and grade A–D/X. Sources: Liquipedia brackets, OGN's channel, Team Liquid VOD threads. Each fact carries its source. Done check: validator passes; match count equals Liquipedia's bracket.
3. **Site: event + match pages** — Astro, static, built from the catalog at build time. In-game broadcast look (docs/ visual direction: inspiration, not replication). Works at phone width. Done check: build passes; pages render for every match.
4. **Site: gap view** — per-event grid of matches coloured by best known grade, X = lost. Done check: a match with no copy shows as a gap.
5. **Deploy to GitHub Pages** — Actions workflow on push to main. Done check: done-gate on the live URL.
6. **Contributor path** — README (what this is), CONTRIBUTING.md ("add or fix a match" in plain steps for non-coders: edit a file on GitHub, open a PR; the validator checks it), issue templates (new copy found / wrong info / history note). Done check: a test PR that adds a copy passes CI.

**Not in M1:** restoration pipeline, before/after comparisons, player/map pages beyond what match pages need, the 1998–99 Tooniverse origins history page (good first contributor job; owner's recollection of late-1998 Tooniverse broadcasts is unverified).

**Rights:** link to existing copies only; never host video (spec §11).
