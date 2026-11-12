import { bestGrade } from '../catalog/grades.js';

const RACES = ['T', 'P', 'Z'];
const slug = (s) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const byDateThenId = (a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999') || a.id.localeCompare(b.id);
const refId = (refs, type) => (refs ?? []).find((r) => r.startsWith(`${type}:`))?.slice(type.length + 1) ?? null;
/** Event id of an item: an event: ref, else the event part of any match:<event>/<match> ref. */
const eventRefOf = (links) => {
  const refs = [...(links?.from ?? []), ...(links?.about ?? []), ...(links?.features ?? [])];
  return refId(refs, 'event') ?? refId(refs, 'match')?.split('/')[0] ?? null;
};
const byId = (list) => new Map(list.map((x) => [x.id, x]));

/** Matchup key like "PT" (sorted), or null when either race is unknown/random. */
export const matchupOf = (races) => {
  const [x, y] = races ?? [];
  return RACES.includes(x) && RACES.includes(y) ? [x, y].sort().join('') : null;
};

function leagueOf(event, seriesById) {
  if (event.series) return { key: event.series, name: seriesById.get(event.series)?.name ?? event.series };
  if (!event.league) return { key: null, name: null };
  return { key: slug(event.league) || event.id, name: event.league };
}

const leagueAka = (event, seriesById) => {
  const s = seriesById.get(event.series);
  return [s?.name, ...(s?.aliases ?? []), event.league].filter(Boolean);
};

function gameRecord(match, game, ctx) {
  const event = ctx.events.get(match.event);
  const names = match.players.map((id) => ctx.players.get(id)?.name ?? null);
  return {
    id: `game:${match.event}/${match.id}#${game.set}`,
    kind: 'game',
    url: `matches/${match.event}/${match.id}/#game-${game.set}`,
    title: names.map((n) => n ?? 'Unknown').join(' vs '),
    date: match.date,
    stage: [match.stage, match.group && `Group ${match.group}`].filter(Boolean).join(' · ') || null,
    set: game.set,
    players: match.players,
    names,
    aka: match.players.map((id) => ctx.players.get(id)?.hangul).filter(Boolean).concat(leagueAka(event, ctx.series)),
    races: game.races ?? [null, null],
    winner: game.winner ?? null,
    event: event.id,
    eventName: event.name,
    year: event.year,
    tier: event.tier,
    league: leagueOf(event, ctx.series).key,
    matchup: matchupOf(game.races),
    map: game.map ?? null,
    mapName: game.map ? ctx.maps.get(game.map)?.name ?? game.map : null,
    grade: bestGrade(game) ?? 'none',
    copies: (game.copies ?? []).length,
  };
}

function itemRecord(item, ctx) {
  const eventId = eventRefOf(item.links);
  const event = eventId ? ctx.events.get(eventId) : null;
  const mapId = refId(item.links?.features, 'map') ?? refId(item.links?.about, 'map');
  const players = (item.links?.about ?? []).filter((r) => r.startsWith('player:')).map((r) => r.slice(7));
  return {
    id: `item:${item.id}`,
    kind: item.kind,
    url: `items/${item.id}/`,
    title: item.title,
    date: item.date,
    stage: null,
    players,
    names: players.map((id) => ctx.players.get(id)?.name ?? null),
    aka: players.map((id) => ctx.players.get(id)?.hangul).filter(Boolean).concat(event ? leagueAka(event, ctx.series) : []),
    event: event?.id ?? null,
    eventName: event?.name ?? null,
    year: item.date ? Number(item.date.slice(0, 4)) : event?.year ?? null,
    tier: event?.tier ?? null,
    league: event ? leagueOf(event, ctx.series).key : null,
    matchup: null,
    map: mapId,
    mapName: mapId ? ctx.maps.get(mapId)?.name ?? mapId : null,
    grade: null,
  };
}

/** The prebuilt search data: flat record list (games first by date, then items) plus id -> display-name labels. */
export function buildRecords(catalog) {
  const ctx = { events: byId(catalog.events), players: byId(catalog.players), maps: byId(catalog.maps), series: byId(catalog.series ?? []) };
  const games = catalog.matches.flatMap((m) => m.games.map((g) => gameRecord(m, g, ctx)));
  const items = (catalog.items ?? []).map((i) => itemRecord(i, ctx));
  const records = [...games.sort(byDateThenId), ...items.sort(byDateThenId)];
  const labels = { player: {}, map: {}, league: {} };
  for (const r of records) {
    r.players.filter(Boolean).forEach((id) => { labels.player[id] = ctx.players.get(id)?.name ?? id; });
    if (r.map) labels.map[r.map] = r.mapName;
    if (r.league) labels.league[r.league] = leagueOf(ctx.events.get(r.event), ctx.series).name;
  }
  return { records, labels };
}
