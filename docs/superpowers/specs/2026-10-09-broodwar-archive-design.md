# Brood War Broadcast Archive — Design

Date: 2026-10-09 · Status: draft for review · Working name: `broodwar-archive`

## 1. Goal

Find, restore, and preserve televised Korean StarCraft: Brood War broadcasts (1998 onward), and make them **truly accessible and as complete as possible**, behind a public site where people can find matches and dig into the history.

North star: **restoration / preservation — the bits are the point.** The catalog and site exist to serve the restored media and to make gaps visible.

## 2. Scope

| In | Out (for now) |
|---|---|
| Televised / official broadcast matches (OSL, MSL, Proleague, later ASL/KSL, etc.) | Ladder, smurf, and small-stakes games as cataloged games |
| Restoration of the best available copy of each match | Re-rendering matches from replays |
| Player identity including ladder/smurf IDs, stored as **claims** | Editorial history and "current events" content (future surface, designed for, not built) |
| `.rep` replay files attached to a cataloged game when found (nice to have) | Self-hosted video streaming |

## 3. Principles

1. **Master and access copy are never confused.** Every restored match has an untouched preservation master and a separately-labeled watchable access copy. The master exists so a better future pipeline is a re-run, not a re-hunt.
2. **Invent nothing in the master.** The access copy may be enhanced, conservatively; every enhancement is recorded.
3. **Lots Of Copies Keep Stuff Safe.** Accessibility comes from redundancy. A takedown should remove a mirror, never the archive.
4. **The catalog is the spine.** Plain files in a public git repo. If everything else is lost, the catalog lets the archive be rebuilt.
5. **Knowledge is recorded as claims with a source.** Especially identity. Claims can be disputed and upgraded.
6. **Gaps are derived, never stored.** The "what's missing" view is computed, so it updates the moment a source is added.
7. **Design for contributions.** Completeness depends on people in the scene who hold sources and knowledge; the system must make submitting either easy.

## 4. Components

| Unit | Does | Depends on |
|---|---|---|
| `catalog` | Schema + data files for events, series, games, players, maps, sources, claims. Validation. | nothing |
| `prospector` | Given a catalog game, finds candidate copies (yt-dlp, archive.org, known channels), probes them, writes `Source` + `SourceSegment` records. Never modifies media. | catalog |
| `restorer` | Source + approved recipe → preservation master, access copy, before/after stills, technical notes. Deterministic and rerunnable. | catalog, ledger |
| `ledger` | Checksums, recipe hash, tool versions, chain of custody for every artifact. | nothing |
| `site` | Static public front-end over the catalog: match pages, before/after comparisons, gap map, player/event/map pages. | catalog (read-only) |

Each unit has a CLI entrypoint and can be used alone. `site` reads the catalog files at build time; it never talks to the pipeline.

## 5. Data model

Entities (all with a stable canonical `id`):

- **Event** — league, season, sponsor name, year, broadcaster, organizer.
- **Series** — event, round/stage, date, two participants (player or team for Proleague), format (Bo1/Bo3/Bo5/ace match), result.
- **Game** — series, set number, map (+ map version), matchup, winner, duration if known, `replays[]` (attached `.rep` files with source).
- **Player** — canonical id, Hangul name, romanizations, race history, team history.
- **Map** — name, version, tileset. Map names have silent versions; the version is part of identity.
- **Source** — one known copy of footage: location (URL / archive.org item / file hash), container, codec, resolution, field order, frame rate, aspect ratio, audio language/offset, completeness, quality grade, provenance (who uploaded, where it came from, when found).
- **SourceSegment** — `source + time range → game`. One upload often contains a whole broadcast (pre-show, ads, several series). This is what lets the catalog say "set 4 is minutes 47–71 of this upload, set 5 is missing from it."
- **Restoration** — source segment, recipe, pipeline version, output artifacts (master, access copy, stills, notes), ledger entry.
- **IdentityClaim** — `player ← alias` with `valid_from`, `valid_to`, `kind` (broadcast name / ladder ID / smurf), `confidence` (confirmed / community-attributed / rumored), `source` (who asserts it, with link or note).

Derived, never stored: **Gap** = any Game with no SourceSegment at or above a quality grade threshold.

Quality grade (initial, refine during slice one): `A` near-source / `B` clean re-encode / `C` degraded but complete / `D` partial or badly damaged / `X` known lost.

## 6. Storage tiers

| Tier | Holds | Where |
|---|---|---|
| 0 Scratch | Intermediates during a run | Local or external disk, deleted after |
| 1 Preservation master | Original file + lossless intermediate | Cloud cold storage (Backblaze B2 or Cloudflare R2) first; a physical drive as the second copy once volume justifies it (3-2-1) |
| 2 Access copies | Watchable restored files | archive.org items (public, free, permanent) + torrents |
| 3 Catalog | All metadata | Public git repo |

Constraint: the dev machine (Apple M3, 16 GB RAM) has ~59 GB free. Slice one must keep scratch small and push masters to tier 1 promptly.

## 7. Restoration pipeline

Per source segment:

1. **Probe** — ffprobe + MediaInfo + sample-frame analysis: field order, interlaced vs progressive vs telecined, true vs flagged aspect ratio, audio offset, burned-in damage.
2. **Recipe** — the tool proposes a recipe file (YAML) from the probe; a human reviews and approves it. Old uploads differ too much for fully automatic decisions. The recipe is data, versioned with the restoration.
3. **Master** — keep the original file byte-for-byte; produce a lossless FFV1/MKV intermediate trimmed to the segment, with corrected field order and aspect flags only.
4. **Access copy** — from the master: deinterlace (`bwdif` default; QTGMC optional for hero matches), aspect correction, light denoise, modest non-hallucinatory upscale, HEVC via VideoToolbox, audio sync fix. AI upscaling is a future, optional, recorded knob.
5. **Evidence** — before/after stills at identical timestamps; short technical notes on what was wrong and what was done.
6. **Ledger** — sha256 of every input and output, recipe hash, tool versions, timestamp.
7. **Publish** — upload master to tier 1, access copy to archive.org, write the Restoration record into the catalog.

## 8. Site

Static site generated from the catalog. Slice one pages:

- **Match page** — series/game metadata, best existing copy (embedded or linked), restored access copy, before/after comparison slider, technical notes, provenance.
- **Event page** — every series/game in the event with source grade per game (a gap map for that event).

Future pages (designed for, not built): player pages with identity timeline, map pages, era/history explorer, current-scene content, contribution form.

## 9. Slice one

Scope: **5–10 matches from one event**, chosen by: historically notable, currently best copy visibly bad, findable. Event chosen by the user at plan time.

Done-gate: **I open the public site, pick a match from the slice, see the best existing copy next to my restored copy with notes on what was fixed, and can stream or download the restored file.**

Sketch:
1. Catalog schema + validator + the slice's event entered by hand → verify: validator passes, deliberate bad file fails.
2. Prospector finds and probes copies for those games → verify: Source/Segment records for each game, gaps visible.
3. Restorer produces master + access copy + stills for one game → verify: before/after stills show a visible fix; checksums in ledger.
4. Publish one game to tier 1 + archive.org → verify: archive.org item streams.
5. Site builds match + event pages → verify: done-gate on the deployed site.
6. Repeat 3–4 for the remaining slice games.

## 10. Stack

- Python CLI for `catalog`, `prospector`, `restorer`, `ledger`.
- ffmpeg 8 (installed), yt-dlp (installed), MediaInfo (to install), VapourSynth + QTGMC (optional, later).
- Catalog: YAML files in git, validated against a JSON Schema.
- Site: Astro, static, free hosting (GitHub Pages or similar). Familiar from `pwp-rts-timeline`.
- archive.org: the `internetarchive` Python library.

## 11. Risks

| Risk | Mitigation |
|---|---|
| Rights-holder takedown | No self-hosted video; mirrors on archive.org + torrents; catalog is independent of any mirror |
| Source quality ceiling — inputs are re-encodes, not masters | Grade honestly; prioritize finding closer-to-source copies through scene contacts |
| Identity errors (aliases, smurfs) | Claims with confidence + source; never assert silently |
| Storage cost grows with completeness | Tiered storage; masters cold; measure per-match size in slice one before scaling |
| Compute on Apple Silicon (no CUDA) | `bwdif` default; QTGMC only for hero matches |
| Scope creep into editorial/news | Out of scope until slice one's done-gate passes |

## 12. Verify before relying on

- Liquipedia content license and API terms (planned catalog seed).
- `internetarchive` library upload API and archive.org collection/policy fit for this material.
- Order-of-magnitude estimates: total broadcast match count (~10k+?) and per-hour master/access sizes — measure in slice one.
