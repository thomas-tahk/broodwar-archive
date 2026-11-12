# Catalog format

The catalog is plain YAML in `catalog/`. It is the spine of the archive (spec §3.4): if everything else is lost, these files rebuild it.

```
catalog/
  series/<series-id>.yaml
  events/<event-id>.yaml
  matches/<event-id>/<match-id>.yaml
  players/<player-id>.yaml
  maps/<map-id>.yaml
  items/<item-id>.yaml
  featured.yaml
  schema/*.schema.json      # JSON Schema for each file kind
```

## Two rules

1. **Every file has `sources:`** — at least one `{url, note?}`. Every fact in the file comes from those sources. If one fact comes from somewhere else, list it under `field_sources: {<field>: <url>}`.
2. **Unknown is `null`, never a guess.** If a value can't be verified, write `null`. Required keys must be present even when `null`.

IDs are lowercase `a-z 0-9 -`. A match's full id is `<event-id>/<match-id>`. File name = id.

## Event

```yaml
id: 2001-sky-osl
name: 2001 SKY OnGameNet StarLeague
league: OSL            # display name of the league, or null. `series` (below) links to a series file
sponsor: SKY           # or null
year: 2001
broadcaster: OnGameNet # or null
organizer: null
expected_games: 66     # optional; or null if unknown. How many games the event had, per a source
series: osl            # id of a series file, or null for a one-off event
tier: big              # never null: big | mid | small, see "Tier rule" below
kind: individual-league # individual-league | team-league | international | cup | invitational | showmatch
tags: []               # optional (absent = []); list of lowercase ids, free-form (e.g. [korea, offline])
completeness: complete # stub | partial | complete, see "Completeness" below
sources:
  - url: https://...
    note: optional, what this source says
field_sources:         # optional
  expected_games: https://...
```

## Match (a series: two players, one or more games)

```yaml
id: ro16-a-1
event: 2001-sky-osl         # must match an event file
stage: Round of 16          # or null
group: A                    # or null
date: 2001-08-10            # ISO date, or null
completeness: partial       # stub | partial | complete
format: Bo1                 # Bo1 | Bo3 | Bo5 | Bo7 | null
players: [boxer, garimto]   # two player ids (an entry may be null)
winner: boxer               # one of players, or null
score: "1-0"                # or null
games:
  - set: 1
    map: lost-temple        # map id, or null
    races: [T, P]           # T | P | Z | R | null, in players order
    winner: boxer           # or null
    lost: false             # true = footage known lost (grade X); needs a source
    copies:                 # every known copy of this game's footage; [] if none known
      - url: https://...    # required; a link only — we never host video
        kind: ogn-official  # ogn-official | ogn-ai-upscale | fan-upload | torrent | other
        title: null
        uploader: null
        resolution: 480p    # or null
        fps: 30             # or null
        grade: B            # A | B | C | D | null (not yet graded)
        grade_note: null    # why this grade
        segment: null       # or {start: "00:47:10", end: "01:11:00"} within the upload
sources:
  - url: https://...
```

A copy's own `url` is its source. One upload that holds several games appears once per game, each with its `segment`.

## Series (recurring leagues only)

A series groups the yearly seasons of one recurring league: OSL, the MSL lineage (including KPGA Tour), Proleague, WCG. One-off events have no series (`series: null` on the event).

```yaml
id: osl
name: OnGameNet StarLeague
aliases: [OSL]         # other names, may be []
organizer: null        # or null
broadcaster: OnGameNet # or null
sources: [{url: https://...}]
```

## Item (anything that is not a match)

Articles, interviews, photo sets, replay packs, showmatch VODs, documents. **Link only, never hosted** (spec section 11).

```yaml
id: example-interview
kind: interview       # open word: article, interview, photo-set, replay-pack, showmatch-vod, document, ...
title: Example interview
date: null            # ISO date, or null
language: ko          # or null
urls:                 # at least one; where the thing lives
  - https://...
links:                # at least one ref in total; each is "type:id"
  about: [player:boxer]                 # who or what it is about
  from: [event:2001-sky-osl]            # where it was published or taken
  features: [match:2001-sky-osl/final, map:incubus]
sources: [{url: https://...}]
```

`kind` is not a fixed list: a new kind is just a new lowercase word (letters, digits, `-`). Refs are `player:<id>`, `event:<id>`, `map:<id>` or `match:<event-id>/<match-id>`. The validator rejects an item with no links and any ref to a record that does not exist.

## Featured

`catalog/featured.yaml` is the ordered list of picks for the home page. Refs may point at any record type (`series:`, `event:`, `match:`, `player:`, `map:`, `item:`); each must exist.

```yaml
featured:
  - ref: event:2001-sky-osl
    blurb: optional one line, or omit
```

## Tier rule

Every event has a `tier`:

| Tier | Meaning |
|---|---|
| big | televised OGN / MBC Game individual or team league, or WCG |
| mid | other broadcast cups and invitationals |
| small | online / community cups |

**Tier sets prominence, never admission.** A small event is as welcome in the archive as a big one; tier only decides how loudly the site shows it.

## Completeness

`completeness` on every event and match covers results and metadata only: `stub` (record exists, most results and metadata unknown), `partial` (some results or metadata missing), `complete` (everything the sources give is recorded). Missing copies are not part of it; they are tracked by the copy-gap status (see Grades). `tier`, `kind` and `completeness` are required and cannot be null.

## Player

```yaml
id: boxer
name: BoxeR           # broadcast name
hangul: null          # e.g. 임요환, or null
race: T               # usual race, or null
sources: [{url: https://...}]
```

## Map

```yaml
id: lost-temple
name: Lost Temple
version: null         # map versions are part of identity; null if unknown
sources: [{url: https://...}]
```

## Grades (spec §5)

| Grade | Meaning |
|---|---|
| A | near-source |
| B | clean re-encode |
| C | degraded but complete |
| D | partial or badly damaged |
| X | known lost (`lost: true` on the game) |

**Gaps are derived, never stored.** A game is a gap when it has no copy graded A–C. Its best grade is the best among its copies; no copies → "none known"; `lost: true` → X.
