# Catalog format

The catalog is plain YAML in `catalog/`. It is the spine of the archive (spec §3.4): if everything else is lost, these files rebuild it.

```
catalog/
  events/<event-id>.yaml
  matches/<event-id>/<match-id>.yaml
  players/<player-id>.yaml
  maps/<map-id>.yaml
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
league: OSL            # or null
sponsor: SKY           # or null
year: 2001
broadcaster: OnGameNet # or null
organizer: null
expected_games: 66     # optional; or null if unknown. How many games the event had, per a source
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
