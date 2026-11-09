# How comparable archives organize big mixed collections

Date: 2026-11-08. Question: how to organize and present OSL/MSL/Proleague
(sponsor name changes), small cups, WCG, showmatches, plus articles, interviews,
photos, replay packs (kinds will grow).

Verification note: liquipedia.net and Discogs support pages returned 403 to the
fetcher. Those two sections rest on search-result summaries of the official pages,
not full page reads. Re-check before relying on fine details. MusicBrainz, archival
and faceted-classification sections come from page reads.

## 1. Liquipedia (StarCraft wiki)

How it works
- Every event gets a tier. SC2 uses letters (S = "Premier", A, B, C); SC1/Brood War
  pages split into Major and Minor tournament lists (some headings say "Tier 2" /
  "Tier 3"). Tiers are about prize pool, prestige and field strength, not a hard number.
- Tier list pages (Premier, Major, Minor, Show Matches, Online) are the browse entry
  points. Show matches get their own list, separate from competitive events.
- Recurring leagues have a series page; each season is its own event page.

Does well
- Newcomers see the important events first; small cups exist but do not clutter the top.
- Showmatches and online events are separated by kind, so nothing is mislabeled.

Lessons
- A "tier" label (big / medium / small) is the cheapest way to separate OSL from a
  random cup. Halo's Liquipedia notes prize pool matters but "does not equal a
  specific tier" - tier is a human judgment, so store it explicitly, don't compute it.
  https://liquipedia.net/starcraft/Minor_Tournaments
- Show matches are their own list/kind, not a tier. Treat "kind of event" and "tier"
  as two separate fields.
  https://liquipedia.net/starcraft/Major_Tournaments/2
- Premier event description (SC2 wiki): "outstanding prize pool, often offline, best
  players worldwide" - tier criteria are written down in plain words.
  https://liquipedia.net/starcraft2/Premier_Tournaments

## 2. MusicBrainz

How it works
- Release group = the abstract thing ("the album"). Release = a concrete edition
  (a specific CD/pressing). One group holds many releases.
- Series = a separate entity that groups other entities sharing a theme, often
  numbered. Series types include Festival ("recurring, usually annual"), Award
  ceremony ("one per year"), Tour, Run, Event series. Entries can be ordered
  manually or automatically.
- Relationships are the general glue: a table per pair of entity types (artist-work,
  recording-work, ...), each link carrying a type, dates and attributes.
- Series can have aliases (other names, languages, misspellings) for search.

Does well
- Separates "the thing" from "its editions" and "the recurring franchise".
- Adding a new relationship type does not require changing the entities.

Lessons
- A recurring league is a Series; each season is a member, in order. The name that
  changed (sponsor) lives on the season, the series keeps one stable identity.
  https://musicbrainz.org/doc/Series
- Aliases on the series solve "OSL = Ongamenet Starleague = Starleague = Nate..."
  without making separate pages. https://musicbrainz.org/doc/Series
- Model links as typed relationships (player-in-match, match-in-event, article-about-
  player) rather than ever-wider rows. https://musicbrainz.org/doc/MusicBrainz_Database/Schema

## 3. Discogs

How it works
- Master release = a display grouping of two or more releases of the same album.
  It "does not change the data" of the releases inside it. One release is the
  "key release" whose title/image represents the group.
- Strict guidelines decide what may share a master (e.g. a combined double-album
  release cannot join the single albums' masters).
- Not verified here: filter/browse UI details (format, year, country, label facets).

Does well
- Grouping is a light layer on top; every concrete item stays addressable.
- A representative item picks the cover for the group.

Lessons
- Our analog: the same match may exist as several video copies. Group copies under
  one match; pick a "best copy" to show first.
  https://support.discogs.com/hc/articles/360005055493-Database-Guidelines-16-Master-Release
- Write the grouping rules down; Discogs needs a page of edge cases for what counts as
  the same. Expect the same for "same match" (re-uploads, partial VODs).
  https://support.discogs.com/hc/articles/360004017694-Database-Glossary

## 4. Archival practice vs faceted classification

Archival hierarchy
- ISAD(G) arranges material as fonds/collection -> series -> file -> item and
  describes from general to specific. SAA glossary: a series groups records "related
  because they were created, received, or used in the same activity"; "the series is
  the usual unit of cataloging or description."
  https://dictionary.archivists.org/entry/series.html
  (ISAD(G) PDF itself did not parse; levels as cited in the SAA entry.
  https://www.ica.org/resource/isadg-general-international-standard-archival-description-second-edition/)
- Strength: one place per thing, easy to cite, matches how material was created.
  Weakness: each item has exactly one parent, so cross-cutting questions are awkward.

Faceted classification (Ranganathan)
- Independent categories (his PMEST: personality, matter, energy, space, time)
  combined on demand. Items can carry several at once; new facets added without
  reorganizing. Drawback: complex, and some items fit several facets arbitrarily.
  https://en.wikipedia.org/wiki/Faceted_classification

Lessons
- Hierarchy answers "where does this live"; facets answer "show me everything about X".
  Use hierarchy for identity, facets for discovery.
- Hierarchy depth should stay shallow (series -> season/event -> match/item); deep
  trees are where archives get hard to browse.
- Facets suit growing content kinds: adding "interview" or "replay pack" is a new value,
  not a new structure.

## 5. Optional sports/film archive

Not researched from primary sources (time). Known pattern from IMDb/Basketball-
Reference style sites (unverified here): series -> season -> episode/game, plus
cross-cutting person pages. Same shape as MusicBrainz series.

## What this suggests for us

Pattern: a few strong hierarchies for the big recurring things, plus tags/facets for
everything else, tied together by typed links between entities.

1. Series (stable identity) -> Event (a season/edition) -> Match. For OSL, MSL,
   Proleague, WCG. Series has aliases; each event holds that season's sponsor name.
2. Every event also gets: tier (big / medium / small, set by hand), kind (league,
   cup, international, showmatch), year, and tags. Small cups need no series, just
   tier + year.
3. Non-match content (article, interview, photo set, replay pack) is one generic
   "item" with a kind field, linked to events/players/matches. New kinds = new
   value, no new structure.
4. Entities (players, maps, teams) are their own pages, reached by links, not folders.
5. Copies: several files per match, one marked best (Discogs key release idea).

Navigation: home shows big series first (tier), then a browse-by-filter view
(year, kind, player, map, tier). Hierarchy for "where is it", filters for "find it".

Tradeoffs
- Tier is manual: needs a stated rule and someone to keep it consistent.
- Series membership needs an up-front decision per event; orphan cups stay series-less.
- Facets add fields to maintain; keep to few (kind, tier, year, tags) at first.
- Typed links grow powerful but are more YAML to write; start with a few link types.
- A single hierarchy cannot also express "all of player X's content"; that must come
  from links, not folders.
