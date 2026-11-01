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

function matchErrors(entry, known) {
  const m = entry.data;
  const players = Array.isArray(m.players) ? m.players : [];
  const errors = [
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

export function crossFileErrors(allEntries) {
  const entries = allEntries.filter(ok);
  const known = {
    events: idSet(entries, 'event'),
    players: idSet(entries, 'player'),
    maps: idSet(entries, 'map'),
  };
  return [
    ...entries.flatMap(idErrors),
    ...duplicateErrors(entries),
    ...entries.filter((e) => e.kind === 'match').flatMap((e) => matchErrors(e, known)),
  ];
}
