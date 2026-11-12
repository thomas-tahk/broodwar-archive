import fs from 'node:fs';
import path from 'node:path';
import { parse, parseDocument, stringify } from 'yaml';
import { SubmissionError } from './parse.js';

const ID = /^[a-z0-9-]+$/;
const FOLDERS = { event: 'events', player: 'players', map: 'maps', series: 'series', item: 'items' };
const BLOCKED_FIELDS = ['id', 'event', 'sources'];

const fail = (msg) => { throw new SubmissionError(msg); };
const lines = (s) => (s ?? '').split('\n').map((l) => l.trim()).filter(Boolean);
const orNull = (s) => (s === undefined || s === '' || s === '-' ? null : s);

function id(label, value) {
  if (!ID.test(value ?? '')) fail(`${label} "${value}" is not allowed. Use only lowercase letters, numbers and dashes.`);
  return value;
}

function nullableId(label, value) {
  return value === null ? null : id(label, value);
}

function toInt(label, value) {
  if (!/^-?\d+$/.test(value ?? '')) fail(`${label} "${value}" must be a whole number.`);
  return Number(value);
}

function sourceList(text, label = 'Sources') {
  const urls = lines(text);
  if (urls.length === 0) fail(`${label} needs at least one link.`);
  return urls.map((url) => ({ url }));
}

/** toString options that keep untouched lines byte-identical (no re-wrap, no brace padding). */
export const YAML_OUT = { lineWidth: 0, flowCollectionPadding: false };

function dump(data) {
  return stringify(data, { lineWidth: 0 });
}

function newFile(catalogDir, rel, data) {
  if (fs.existsSync(path.join(catalogDir, rel))) {
    fail(`${rel} already exists. Use the "fix a record" form to change it.`);
  }
  return { file: rel, text: dump(data) };
}

function readExisting(catalogDir, rel, what) {
  const full = path.join(catalogDir, rel);
  if (!fs.existsSync(full)) fail(`${what} does not exist (looked for ${rel}). Add it first.`);
  return fs.readFileSync(full, 'utf8');
}

export function buildEvent(v, catalogDir) {
  const eventId = id('Event id', v.event_id);
  return newFile(catalogDir, `events/${eventId}.yaml`, {
    id: eventId,
    name: v.event_name,
    league: v.league,
    sponsor: v.sponsor,
    year: toInt('Year', v.year),
    broadcaster: v.broadcaster,
    organizer: v.organizer,
    series: nullableId('Series id', v.series_id),
    tier: v.tier,
    kind: v.event_kind,
    tags: [],
    completeness: 'stub',
    sources: sourceList(v.sources),
  });
}

function parseGame(line) {
  const parts = line.split('|').map((p) => p.trim());
  if (parts.length !== 4) fail(`Game line "${line}" needs 4 parts: set | map id | races | winner id.`);
  const races = parts[2].split(/\s+/).map((r) => orNull(r));
  if (races.length !== 2) fail(`Game line "${line}": races needs two entries, like "T P". Use - for unknown.`);
  return {
    set: toInt('Game set', parts[0]),
    map: nullableId('Map id', orNull(parts[1])),
    races,
    winner: nullableId('Game winner id', orNull(parts[3])),
    lost: false,
    copies: [],
  };
}

export function buildMatch(v, catalogDir) {
  const eventId = id('Event id', v.event_id);
  const matchId = id('Match id', v.match_id);
  const games = lines(v.games).map(parseGame);
  return newFile(catalogDir, `matches/${eventId}/${matchId}.yaml`, {
    id: matchId,
    event: eventId,
    stage: v.stage,
    group: v.group,
    date: v.date,
    format: v.format === 'Unknown' ? null : v.format,
    players: [nullableId('Player 1 id', v.player1), nullableId('Player 2 id', v.player2)],
    winner: nullableId('Winner id', v.winner),
    score: v.score,
    games,
    completeness: games.length > 0 ? 'partial' : 'stub',
    sources: sourceList(v.sources),
  });
}

function segmentOf(v) {
  if (!v.segment_start && !v.segment_end) return null;
  if (!v.segment_start || !v.segment_end) fail('Segment start and end go together. Fill both or neither.');
  return { start: v.segment_start, end: v.segment_end };
}

function copyOf(v) {
  const fps = v.fps === null ? null : Number(v.fps);
  if (fps !== null && !Number.isFinite(fps)) fail(`Frame rate "${v.fps}" must be a number.`);
  return {
    url: v.copy_link,
    kind: v.copy_kind,
    title: v.copy_title,
    uploader: v.uploader,
    resolution: v.resolution,
    fps,
    grade: null,
    grade_note: null,
    segment: segmentOf(v),
  };
}

export function buildCopy(v, catalogDir) {
  const rel = `matches/${id('Event id', v.event_id)}/${id('Match id', v.match_id)}.yaml`;
  const doc = parseDocument(readExisting(catalogDir, rel, `Match ${v.event_id}/${v.match_id}`));
  const set = toInt('Game number', v.game_number);
  const games = doc.get('games')?.items ?? [];
  const index = games.findIndex((g) => g.get('set') === set);
  if (index < 0) fail(`Match ${v.event_id}/${v.match_id} has no game ${set}. Add the game first (fix form, or ask a maintainer).`);
  const copies = doc.getIn(['games', index, 'copies']);
  if (!copies?.items) fail(`Game ${set} has no copies list to add to.`);
  if (copies.items.length === 0) copies.flow = false;
  doc.addIn(['games', index, 'copies'], doc.createNode(copyOf(v)));
  return { file: rel, text: doc.toString(YAML_OUT) };
}

export function buildItem(v, catalogDir) {
  const itemId = id('Item id', v.item_id);
  const urls = lines(v.links);
  if (urls.length === 0) fail('Links needs at least one link.');
  const about = lines(v.about).flatMap((l) => l.split(',')).map((s) => s.trim()).filter(Boolean);
  return newFile(catalogDir, `items/${itemId}.yaml`, {
    id: itemId,
    kind: id('Kind of item', v.item_kind),
    title: v.title,
    date: v.date,
    language: v.language,
    urls,
    links: about.length > 0 ? { about } : {},
    sources: urls.map((url) => ({ url })),
  });
}

function recordFile(ref) {
  const m = /^(event|player|map|series|item|match):(.+)$/.exec(ref);
  if (!m) fail(`Record "${ref}" must look like kind:id, for example player:boxer or match:2001-sky-osl/final.`);
  const [, kind, rest] = m;
  if (kind === 'match') {
    const [event, match, ...extra] = rest.split('/');
    if (extra.length > 0 || !match) fail(`Record "${ref}": a match is match:<event-id>/<match-id>.`);
    return `matches/${id('Event id', event)}/${id('Match id', match)}.yaml`;
  }
  return `${FOLDERS[kind]}/${id('Record id', rest)}.yaml`;
}

function fieldPath(field) {
  const segments = field.split('.').map((s) => (/^\d+$/.test(s) ? Number(s) : s));
  if (!segments.every((s) => typeof s === 'number' || /^[a-z_]+$/.test(s))) {
    fail(`Field "${field}" is not allowed. Use names like winner or games.1.map.`);
  }
  if (segments.includes(0)) fail(`Field "${field}": list positions are counted from 1 (games.1.map is the first game).`);
  segments.forEach((s, i) => { if (typeof s === 'number') segments[i] = s - 1; });
  if (BLOCKED_FIELDS.includes(segments[0])) fail(`Field "${segments[0]}" cannot be changed with this form. Ask a maintainer.`);
  return segments;
}

function newValue(text) {
  try {
    return parse(text);
  } catch {
    return fail(`New value "${text}" could not be read. Use plain text, a number, or null.`);
  }
}

export function buildFix(v, catalogDir) {
  const rel = recordFile(v.record);
  const doc = parseDocument(readExisting(catalogDir, rel, `Record ${v.record}`));
  const segments = fieldPath(v.field);
  if (!doc.hasIn(segments)) fail(`Record ${v.record} has no field "${v.field}".`);
  doc.setIn(segments, newValue(v.new_value));
  doc.addIn(['sources'], doc.createNode({ url: v.source, note: 'Correction submitted via issue form' }));
  return { file: rel, text: doc.toString(YAML_OUT) };
}

export const BUILDERS = { event: buildEvent, match: buildMatch, copy: buildCopy, item: buildItem, fix: buildFix };
