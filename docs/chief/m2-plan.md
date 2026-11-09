# M2 — Browse the whole archive (plan, awaiting approval)

Owner's ask (2026-11-08 Shape, Q1–Q14): the archive must hold big leagues, small cups, rare internationals (WCG), showmatches and any non-match material he deems part of StarCraft history, without forcing it all into a league tree. Answers: front door = **A league menu + B timeline** on home; data shape = Series → Event → Match plus a flexible Item; tier rule as proposed; contributor stage 1 (already partly in M1).
Options page: [m2-structure.html](shape/m2-structure.html). Research: [organization](research/m2-organization-models.md), [contributors](research/m2-contributor-scaling.md), [search](research/m2-static-search.md).

**Done-gate:** On my phone I open the archive home, tap **OSL** in the league menu and open a second OSL season; back on home I scroll the timeline to 2001, open a **WCG 2001** match, then an **interview** about a player, and on that player's page see their games from more than one event; on Find I filter by league = OSL and year = 2001 and the counts match.

## Decisions carried in
- **Series** only for recurring leagues (OSL, MSL lineage incl. KPGA Tour, Proleague, WCG); one-off events have no series.
- **Event** gains `series` (or null), `tier` (big / mid / small), `kind` (individual league, team league, international, cup, invitational, showmatch), `tags`. Tier rule: big = televised OGN/MBC Game individual or team league, or WCG; mid = other broadcast cups and invitationals; small = online/community cups. Tier sets prominence, never admission.
- **Item**: one record type with `kind` (article, interview, photo set, replay pack, showmatch VOD, document, …; new kind = new word) and typed links (`about`, `from`, `features`) to players, events, matches, maps. Link only, never host (spec §11).
- **Search**: one prebuilt record list filtered in the browser behind `search(query, selection) → {results, counts}`; switch to Pagefind past ~5–8k games or ~1 MB.
- **Contributors**: stage 1 = validator CI + CONTRIBUTING + issue forms (exist from M1), extended to the new record kinds. Trusted reviewers (CODEOWNERS) later, when 3+ people have 10+ merged PRs.

## Issues (build order by blocking edges)
1. **Catalog v2 schema** — series files, new event fields, item files, migrate 2001 SKY OSL; tier rule in docs/catalog-format.md. Done: validator tests for each new field + a broken item fails. *database-engineer*. Blocks all.
2. **Home: league menu + featured + timeline + latest** — league bar under header (series with tier big), featured picks from `catalog/featured.yaml`, timeline by year (big events as bands, others as chips, items included), latest additions strip. Done: e2e at 375/1280, every timeline entry links. *frontend-engineer*. Blocked by 1.
3. **Series pages + all-events listing** — `/series/<id>/` seasons by year; `/events/` every event filterable by tier/kind/year. Done: e2e. *frontend-engineer*. Blocked by 1.
4. **Player + map pages** — games across all events, items about them. Done: e2e on a player in two events. *frontend-engineer*. Blocked by 1.
5. **Item pages + item links on related pages** — item page, and items listed on linked player/event/match pages. Done: e2e. *frontend-engineer*. Blocked by 1.
6. **Find v2** — search module + record list; text box; filters kind, year, tier, league, player, matchup grid, map, copy grade; live counts. Done: unit tests on `search()` + e2e OSL/2001 counts. *frontend-engineer*. Blocked by 1.
7. **Catalog: second OSL season** (the season adjacent to 2001 SKY OSL, per Liquipedia). Done: validator + match count equals Liquipedia's bracket. *broodwar-cataloger*. Blocked by 1.
8. **Catalog: WCG 2001 StarCraft + one KPGA Tour season** (MSL lineage). Same done check. *broodwar-cataloger*. Blocked by 1.
9. **Catalog: first items** — at least 6 real items across ≥3 kinds (interviews, articles, photo sets, a showmatch VOD), each sourced and linked. Seed `featured.yaml`. Done: validator; each item linked to ≥1 record. *broodwar-cataloger*. Blocked by 1.
10. **Contributor docs for new kinds** — CONTRIBUTING sections + issue form for "add an item" and "add an event". Done: contributing test covers them. *frontend-engineer*. Blocked by 1, 5.

Milestone end: code-reviewer on the whole diff, qa-engineer runs the done-gate on the branch preview (https://thomas-tahk.github.io/broodwar-archive/m2-shape/).

**Not in M2:** restoration, submission form → PR, CODEOWNERS reviewers, Pagefind, custom domain (waits on his domain name).
