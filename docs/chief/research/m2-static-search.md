# M2 static search: options (researched 2026-11-08)

Need: site-wide text search + facets (kind, year range, event type, league, player, matchup, map, copy quality) with live counts; no server; GitHub Pages; 58 games now, maybe tens of thousands plus articles/videos.

Versions (npm, checked today): pagefind 1.6.0 (2026-11-01), astro-pagefind 2.0.1, @orama/orama 3.1.18, minisearch 7.2.0, flexsearch 0.8.212.
"Verified" = read in official docs/README; "unverified" = not confirmed in a primary source this pass (benchmark before relying).

## Pagefind - https://pagefind.app
- Built as a post-build CLI over the generated HTML (or `addCustomRecord` in the Node API for non-HTML records: url, content, language, `meta`, `filters` {key: [strings]}, `sort`). Verified.
- Facets: `data-pagefind-filter` tags (multi-valued per page). JS API `pagefind.filters()` loads all filters; each search returns `filters` (count if value added to current selection) and `totalFilters` (count if it replaced it), plus `unfilteredResultCount`. Verified, this is exactly live facet counts.
- Combining: default AND; `any`, `all`, `none`, `not`, nestable (OR within a facet, AND across). Verified.
- Year range: NO documented numeric/range filter; filter values are strings (docs example `year: "2018"`). Workaround: year as a filter value, UI sends `any: [years...]`. Fine for ~25 years.
- Sort: `data-pagefind-sort` / custom-record `sort`; numeric if all values numeric, else alphabetical; precomputed at index time; pages lacking the key drop out of that sorted result. Verified.
- Scale/chunking: index is split into many chunks, browser fetches only chunks for the query terms. Docs sample: 2,496 pages / 22,852 words -> 27 index chunks. README: "Static low-bandwidth search at scale", "aims to perform well on large sites" - a goal, no published benchmarks. Chunk/size internals not in the pages fetched (unverified). Filter UI needs `filters()` loaded up front (filter index is loaded whole; grows with distinct values, not rows).
- Astro: `astro-pagefind` integration (2.0.1) runs it on build; or just run `npx pagefind --site dist` post-build. 1.5.0+ ships a Component UI; custom UI over the JS API is also supported.
- Gotcha: one Pagefind "page" per record, so one result row per game requires either a page per game or custom records (record needs a url; game cards could link to anchors/pages).

## Orama - https://docs.orama.com , https://github.com/oramasearch/orama
- In-memory JS engine, typed schema, "facets" and "search filters" are listed features; Astro plugin exists. Verified as features; detail pages (facet types: string/number/boolean/range, counts, `where` interplay) failed to fetch this pass - unverified, but from memory range numeric facets and counts exist.
- Whole index lives in browser memory; shipped as persisted JSON/binary via the data-persistence plugin (docs page body not retrievable here). So download size scales with corpus (full index up front, no chunking). Project claims core runs "in less than 2kb". No scale numbers in README.
- Best fit when you want typed numeric ranges + facet counts in one call.

## MiniSearch - https://github.com/lucaong/minisearch (7.2.0)
- Full text with prefix + fuzzy + boosting. `filter` option is a per-result function. README does not mention facets (unverified: none built in; you count yourself from the matching ids). Serialize via JSON (`toJSON`/`loadJSON`), size figures not documented. "Designed for data that fits in local memory", mobile-friendly. Whole index downloaded up front.

## FlexSearch - https://github.com/nextapps-de/flexsearch (0.8.212)
- Fastest raw search; Document index with tag search; resolver ops and/or/xor/not; Worker option; export/import and persistent indexes. No facets/counts documented (you compute). README index-size example: 2.1 MB default for one novel text, 12.5 MB at context depth 1, 21.5 MB at depth 2 - memory-heavy knobs. Whole index downloaded up front.

## Prebuilt JSON + client-side filter (no library)
- Emit one `games.json` at build (compact arrays/dictionary-coded fields), filter with plain JS, counts by one pass per facet (exclude own facet for disjunctive counts), text via `String.includes` on a lowercased haystack or add MiniSearch just for text.
- Facets, year ranges, counts: trivial and exact, full control. Cost: whole file downloaded. Rough (my estimate, not sourced): ~150-300 B/game minified, gzip 4-6x smaller -> 10k games ~ 2-3 MB raw / ~0.5 MB gzipped; 50k ~ 10-15 MB raw / ~2-3 MB gzip. Filtering 50k rows in JS is ms-scale.

## Comparison
| | facet counts | year range | text | download | ceiling (indicative) |
|---|---|---|---|---|---|
| Pagefind | built in, exact | string values only | stemming, multi-lang, ranked | chunked, on demand | best at 10k+; docs-scale proven |
| Orama | built in (unverified detail) | numeric ranges | good | full index | ~tens of MB gets painful |
| MiniSearch | DIY | DIY | prefix/fuzzy | full index | low tens of thousands rows |
| FlexSearch | DIY | DIY | fast | full index, can be large | similar, memory-tuning needed |
| Plain JSON | DIY, trivial | DIY, trivial | substring | full file | ~20-30k rows then slow first load |

## Recommendation
- Now (58 -> ~2,000 games): plain prebuilt JSON + client filtering, MiniSearch only if fuzzy/prefix text is wanted. Exact facets, exact year range, zero build tooling, one file, trivially debuggable. Pagefind's hard-to-do bit (numeric year range) is our one real requirement.
- Switch to Pagefind (custom records via Node API, facets via `filters`/`totalFilters`, years as filter values) when ANY of: gzipped catalog JSON > ~1-1.5 MB (~5-8k games), first-load search latency > ~1s on mid phone, or articles/videos (long text) join the index. Pagefind then also covers articles natively as HTML.
- Orama is the alternative only if numeric range facets inside the engine matter and the corpus stays under ~10 MB; skip FlexSearch (no facets, memory-tuned).
- Design now so the switch is cheap: define a single `SearchRecord` shape (id, url, text, kind, year, eventType, league, players[], matchup, map, copyQuality) emitted at build; both the JSON path and Pagefind custom records consume it. Keep the facet UI behind a `search(query, selection) -> {results, counts}` function.
- To verify before committing: Pagefind filter-index size with ~10k custom records and ~10 facets (spike: generate synthetic records, run `pagefind`, measure chunk + filter file sizes); Orama facet/persistence docs (fetch failed).
