import fs from 'node:fs';
import path from 'node:path';

/** Cross-file rules. Each returns [{file, path, message}]. */

const err = (entry, field, message) => ({ file: entry.file, path: field, message });
const ok = (entry) => entry.data && typeof entry.data === 'object' && !Array.isArray(entry.data);

function fileStem(entry) {
  return path.basename(entry.file, '.yaml');
}

function idErrors(entry) {
  const { id } = entry.data;
  if (typeof id !== 'string') return [];
  const errors = [];
  if (id !== fileStem(entry)) {
    errors.push(err(entry, 'id', `id "${id}" must match the file name "${fileStem(entry)}.yaml". Rename the file or change the id`));
  }
  if (entry.kind === 'match') {
    const folder = path.basename(path.dirname(entry.file));
    if (entry.data.event !== folder) {
      errors.push(err(entry, 'event', `event "${entry.data.event}" must match the folder this match is in ("${folder}"). Move the file or change the event`));
    }
  }
  return errors;
}

function fullIdOf(entry) {
  const { id, event } = entry.data;
  return entry.kind === 'match' ? `${event}/${id}` : id;
}

function duplicateErrors(entries) {
  const seen = new Map();
  const errors = [];
  for (const entry of entries) {
    if (typeof entry.data.id !== 'string') continue;
    const key = `${entry.kind}:${fullIdOf(entry)}`;
    if (seen.has(key)) {
      errors.push(err(entry, 'id', `id "${fullIdOf(entry)}" is already used by ${seen.get(key)}. Every ${entry.kind} needs its own id`));
    } else {
      seen.set(key, entry.file);
    }
  }
  return errors;
}

function idSet(entries, kind) {
  return new Set(entries.filter((e) => e.kind === kind && typeof e.data.id === 'string').map((e) => e.data.id));
}

function refError(entry, field, value, kind, known) {
  if (value == null || known.has(value)) return [];
  return [err(entry, field, `${kind} "${value}" does not exist. Add ${kind}s/${value}.yaml or fix the spelling`)];
}

function winnerError(entry, field, winner, players) {
  if (winner == null || players.includes(winner)) return [];
  return [err(entry, field, `winner "${winner}" is not one of this match's players (${players.filter(Boolean).join(', ')}). Fix the winner or the players list`)];
}

function gameErrors(entry, game, i, ctx) {
  const where = `games[${i}]`;
  return [
    ...refError(entry, `${where}.map`, game.map, 'map', ctx.maps),
    ...winnerError(entry, `${where}.winner`, game.winner, ctx.players),
  ];
}

function samePlayerErrors(entry, players) {
  const [a, b] = players;
  if (a == null || a !== b) return [];
  return [err(entry, 'players[1]', `player "${a}" is listed twice. A match needs two different players`)];
}

function matchErrors(entry, known) {
  const m = entry.data;
  const players = Array.isArray(m.players) ? m.players : [];
  const errors = [
    ...samePlayerErrors(entry, players),
    ...refError(entry, 'event', m.event, 'event', known.events),
    ...players.flatMap((p, i) => refError(entry, `players[${i}]`, p, 'player', known.players)),
    ...winnerError(entry, 'winner', m.winner, players),
  ];
  const games = Array.isArray(m.games) ? m.games : [];
  games.forEach((g, i) => {
    if (g && typeof g === 'object') errors.push(...gameErrors(entry, g, i, { maps: known.maps, players }));
  });
  return errors;
}

const REF_HOME = {
  series: 'series/<id>.yaml', event: 'events/<id>.yaml', player: 'players/<id>.yaml',
  map: 'maps/<id>.yaml', item: 'items/<id>.yaml', match: 'matches/<event-id>/<match-id>.yaml',
};

/** Resolve "type:id" refs (match ids are "event/match"). Returns an error list. */
function linkError(entry, field, ref, known) {
  if (typeof ref !== 'string') return [];
  const [type, ...rest] = ref.split(':');
  const id = rest.join(':');
  if (!REF_HOME[type] || !/^[a-z0-9-]+(\/[a-z0-9-]+)?$/.test(id) || known[type]?.has(id)) return [];
  return [err(entry, field, `${type} "${id}" does not exist. Add ${REF_HOME[type].replace('<id>', id)} or fix the spelling`)];
}

const LINK_KINDS = ['about', 'from', 'features'];

function linkLists(item) {
  const links = item.links && typeof item.links === 'object' && !Array.isArray(item.links) ? item.links : {};
  return LINK_KINDS.map((kind) => [kind, Array.isArray(links[kind]) ? links[kind] : []]);
}

function itemErrors(entry, known) {
  const lists = linkLists(entry.data);
  const none = err(entry, 'links', 'an item must link to at least one player, event, match or map. Add it under about:, from: or features:');
  const errors = lists.every(([, refs]) => refs.length === 0) ? [none] : [];
  for (const [kind, refs] of lists) {
    refs.forEach((ref, i) => errors.push(...linkError(entry, `links.${kind}[${i}]`, ref, known)));
  }
  return errors;
}

function featuredErrors(entry, known) {
  const list = Array.isArray(entry.data.featured) ? entry.data.featured : [];
  return list.flatMap((f, i) => linkError(entry, `featured[${i}].ref`, f?.ref, known));
}

function eventSeriesErrors(entry, known) {
  const { series } = entry.data;
  return series == null ? [] : linkError(entry, 'series', `series:${series}`, { series: known.series });
}

export function crossFileErrors(allEntries) {
  const entries = allEntries.filter(ok);
  const known = {
    events: idSet(entries, 'event'),
    players: idSet(entries, 'player'),
    maps: idSet(entries, 'map'),
    series: idSet(entries, 'series'),
  };
  const refs = {
    event: known.events, player: known.players, map: known.maps, series: known.series,
    item: idSet(entries, 'item'),
    match: new Set(entries.filter((e) => e.kind === 'match').map(fullIdOf)),
  };
  const of = (kind) => entries.filter((e) => e.kind === kind);
  return [
    ...of('event').flatMap((e) => eventSeriesErrors(e, known)),
    ...of('item').flatMap((e) => itemErrors(e, refs)),
    ...of('featured').flatMap((e) => featuredErrors(e, refs)),
    ...entries.flatMap(idErrors),
    ...duplicateErrors(entries),
    ...entries.filter((e) => e.kind === 'match').flatMap((e) => matchErrors(e, known)),
  ];
}

const PLACED = [
  /^events\/[^/]+\.yaml$/,
  /^players\/[^/]+\.yaml$/,
  /^maps\/[^/]+\.yaml$/,
  /^series\/[^/]+\.yaml$/,
  /^items\/[^/]+\.yaml$/,
  /^featured\.yaml$/,
  /^matches\/[^/]+\/[^/]+\.yaml$/,
  /^schema\/[^/]+$/,
  /(^|\/)\.gitkeep$/,
];

function walk(dir, rel = '') {
  return fs.readdirSync(path.join(dir, rel), { withFileTypes: true }).flatMap((e) => {
    const next = rel ? `${rel}/${e.name}` : e.name;
    return e.isDirectory() ? walk(dir, next) : [next];
  });
}

export function misplacedFileErrors(dir) {
  const expected = 'Files must be events/<id>.yaml, series/<id>.yaml, items/<id>.yaml, players/<id>.yaml, maps/<id>.yaml, matches/<event-id>/<id>.yaml or featured.yaml';
  return walk(dir)
    .filter((f) => !PLACED.some((re) => re.test(f)))
    .map((f) => ({ file: f, path: '(file location)', message: `this file is in the wrong place or has the wrong name. ${expected}` }));
}
