# M2 — Browse the whole archive, built for contributors to fill (plan, awaiting approval)

Owner's ask (2026-11-08 Shape, Q1–Q14): the archive must hold big leagues, small cups, rare internationals (WCG), showmatches and any non-match material he deems part of StarCraft history, without forcing it all into a league tree. Answers: front door = **A league menu + B timeline** on home; data shape = Series → Event → Match plus a flexible Item; tier rule as proposed; contributor stage 1 (already partly in M1).
Options page: [m2-structure.html](shape/m2-structure.html). Research: [organization](research/m2-organization-models.md), [contributors](research/m2-contributor-scaling.md), [search](research/m2-static-search.md).

**Done-gate:** On my phone I open the archive home, tap **OSL** in the league menu and open a second OSL season; back on home I scroll the timeline to 2001, open a **WCG 2001** match, then an **interview** about a player, and on that player's page see their games from more than one event; on Find I filter by league = OSL and year = 2001 and the counts match. Then, on an unfinished event page, I tap **Help fill this**, submit the form without touching git, and a pull request appears that passes the checks.

**Revision 2026-11-11 (his review):** scaffolding over content. M2 builds what lets contributors complete the archive; cataloging shrinks to one real seed of each record shape, partial records allowed.

## Decisions carried in
- **Series** only for recurring leagues (OSL, MSL lineage incl. KPGA Tour, Proleague, WCG); one-off events have no series.
- **Event** gains `series` (or null), `tier` (big / mid / small), `kind` (individual league, team league, international, cup, invitational, showmatch), `tags`. Tier rule: big = televised OGN/MBC Game individual or team league, or WCG; mid = other broadcast cups and invitationals; small = online/community cups. Tier sets prominence, never admission.
- **Item**: one record type with `kind` (article, interview, photo set, replay pack, showmatch VOD, document, …; new kind = new word) and typed links (`about`, `from`, `features`) to players, events, matches, maps. Link only, never host (spec §11).
- **Search**: one prebuilt record list filtered in the browser behind `search(query, selection) → {results, counts}`; switch to Pagefind past ~5–8k games or ~1 MB.
- **Contributors**: stage 1 (validator CI + CONTRIBUTING + issue forms, from M1) extended to new kinds, **plus stage 3 pulled into M2**: issue form → GitHub Action → pull request, so no git needed. He still merges. Trusted reviewers (CODEOWNERS) later, when 3+ people have 10+ merged PRs.
- **Incomplete is normal**: every event/match carries `completeness` (stub / partial / complete); pages show what's missing and a prefilled "Help fill this" link.

## Issues (build order by blocking edges)
1. **Catalog v2 schema** — series files, new event fields, item files, migrate 2001 SKY OSL; tier rule in docs/catalog-format.md. Done: validator tests for each new field + a broken item fails. *database-engineer*. Blocks all.
2. **Home: league menu + featured + timeline + latest** — league bar under header (series with tier big), featured picks from `catalog/featured.yaml`, timeline by year (big events as bands, others as chips, items included), latest additions strip. Done: e2e at 375/1280, every timeline entry links. *frontend-engineer*. Blocked by 1.
3. **Series pages + all-events listing** — `/series/<id>/` seasons by year; `/events/` every event filterable by tier/kind/year. Done: e2e. *frontend-engineer*. Blocked by 1.
4. **Player + map pages** — games across all events, items about them. Done: e2e on a player in two events. *frontend-engineer*. Blocked by 1.
5. **Item pages + item links on related pages** — item page, and items listed on linked player/event/match pages. Done: e2e. *frontend-engineer*. Blocked by 1.
6. **Find v2** — search module + record list; text box; filters kind, year, tier, league, player, matchup grid, map, copy grade; live counts. Done: unit tests on `search()` + e2e OSL/2001 counts. *frontend-engineer*. Blocked by 1.
7. **Catalog: one real seed of each shape** — second OSL season as a stub (event + final only), WCG 2001 final, one KPGA Tour season stub, 3 real items of 3 kinds, `featured.yaml` seed. Sourced; unknown = null; marked stub/partial. Done: validator; each shape appears on its page. *broodwar-cataloger*. Blocked by 1.
8. **Incomplete-record support** — `completeness` field + "what's missing" panel on event/match pages with a "Help fill this" link to the right issue form, prefilled with the record id. Done: e2e on a stub event. *frontend-engineer*. Blocked by 1, 3.
9. **Help-wanted page** — `/help-wanted/` lists gaps: stub/partial events, matches with no copies, missing results, sorted by tier. Linked from header and CONTRIBUTING. Done: e2e; counts equal catalog gaps. *frontend-engineer*. Blocked by 1.
10. **Submit without git** — issue forms for add/fix match, event, copy, item; a GitHub Action turns a labelled submission into a pull request with the YAML file, runs the validator, comments the result back on the issue. Done: a test submission issue produces a green pull request. *backend-engineer*. Blocked by 1.
11. **Contributor docs for new kinds** — CONTRIBUTING sections for items, events, series, completeness, the no-git path. Done: contributing test covers them. *frontend-engineer*. Blocked by 1, 10.

Milestone end: code-reviewer on the whole diff, qa-engineer runs the done-gate on the branch preview (https://thomas-tahk.github.io/broodwar-archive/m2-shape/).

**Not in M2:** restoration, full season cataloging (contributors + later milestones), CODEOWNERS reviewers, Pagefind, custom domain (waits on his domain name).
