import path from 'node:path';
import { loadCatalog } from '../../tools/catalog/load.js';

const dir = path.resolve(process.cwd(), process.env.CATALOG_DIR || 'catalog');
const catalog = loadCatalog(dir);

const byId = (list) => new Map(list.map((x) => [x.id, x]));
const players = byId(catalog.players);
export const maps = byId(catalog.maps);
export const events = [...catalog.events].sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || a.id.localeCompare(b.id));

/** Matches of one event, dated first (ascending), undated last. */
export function matchesOf(eventId) {
  return catalog.matches
    .filter((m) => m.event === eventId)
    .sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999') || a.id.localeCompare(b.id));
}

export const allMatches = catalog.matches;

export const series = byId(catalog.series);
export const items = catalog.items;
/** Ordered featured picks: [{ ref: "event:2001-sky-osl", blurb? }]. */
export const featured = catalog.featured;

/** Seasons (events) of one series, newest first. */
export const eventsOfSeries = (seriesId) => events.filter((e) => e.series === seriesId);

/** Ref string "type:id" for a record; matches use their fullId. */
export const refOf = (type, record) => `${type}:${type === 'match' ? record.fullId : record.id}`;

/** Items whose links (about / from / features) include the ref, e.g. itemsLinkingTo("player:boxer"). */
export function itemsLinkingTo(ref) {
  return items.filter((item) => Object.values(item.links ?? {}).some((refs) => refs.includes(ref)));
}

/** The record a ref points to, or null. ref is "type:id" (match: "event/match"). */
export function resolveRef(ref) {
  const [type, ...rest] = ref.split(':');
  const id = rest.join(':');
  const lookup = {
    series: () => series.get(id),
    event: () => events.find((e) => e.id === id),
    match: () => catalog.matches.find((m) => m.fullId === id),
    player: () => players.get(id),
    map: () => maps.get(id),
    item: () => items.find((i) => i.id === id),
  }[type];
  const record = lookup?.();
  return record ? { type, record } : null;
}

export function playerOf(id) {
  return players.get(id) ?? { id, name: null, hangul: null, race: null };
}

/** Display name for a player id; 'Unknown' when no name is known. */
export const nameOf = (id) => playerOf(id).name ?? 'Unknown';

export function host(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

/** Link to a page inside the site, through the base. */
export function href(p) {
  return `${import.meta.env.BASE_URL.replace(/\/$/, '')}/${p}`.replace(/\/+$/, '/');
}

/** "Round of 8 · Group A" style stage line for a match. */
export const stageOf = (m) => [m.stage ?? 'Stage unknown', m.group && `Group ${m.group}`].filter(Boolean).join(' · ');

export const REPO_URL = 'https://github.com/thomas-tahk/broodwar-archive';

/** "2001.12.28" style date; unknown stays unknown. */
export const ymd = (d) => (d ? d.replaceAll('-', '.') : 'Date unknown');

const STAGE_ORDER = ['Round of 16', 'Round of 8', 'Semifinal', 'Third place', 'Final'];
/** Tab a match belongs to: tiebreakers sit with their round. */
export const stageTabOf = (m) => (m.stage ?? 'Stage unknown').replace(/ tiebreaker$/, '');
const stageRank = (s) => { const i = STAGE_ORDER.indexOf(s); return i < 0 ? STAGE_ORDER.length : i; };
const groupTitle = (m) => `${m.stage?.endsWith('tiebreaker') ? 'Tiebreaker ' : ''}${m.group ? `Group ${m.group}` : ''}`.trim();
/** Round tabs for a match list: [{ key, label, groups: [{ title, matches }] }], bracket order. */
export function stageTabs(matches) {
  const keys = [...new Set(matches.map(stageTabOf))].sort((a, b) => stageRank(a) - stageRank(b));
  return keys.map((key) => {
    const inTab = matches.filter((m) => stageTabOf(m) === key);
    const titles = [...new Set(inTab.map(groupTitle))];
    return { key, label: key.replace('Round of ', 'Ro'), groups: titles.map((title) => ({ title, matches: inTab.filter((m) => groupTitle(m) === title) })) };
  });
}

/** [a, b] score numbers, or null when the score is missing or not N-N. */
export const scorePair = (m) => (m.score && /^\d+-\d+$/.test(m.score) ? m.score.split('-') : null);
export const scoreText = (m) => { const p = scorePair(m); return p ? `${p[0]}–${p[1]}` : m.score ?? '?–?'; };

/** Race of side i when every known game agrees, else null (never the player's usual race). */
export function sideRace(match, i) {
  const known = new Set(match.games.map((g) => g.races?.[i] ?? null).filter(Boolean));
  return known.size === 1 ? [...known][0] : null;
}

export const copyCount = (m) => m.games.reduce((n, g) => n + (g.copies ?? []).length, 0);

/** Plain-word quality labels (letter grades stay visible but small). */
export const GRADE_WORDS = { A: 'Original', B: 'Re-encode', C: 'Degraded', D: 'Damaged', X: 'Lost' };
export const COPY_KINDS = { 'ogn-official': 'Original broadcast', 'ogn-ai-upscale': 'AI upscale', 'fan-upload': 'Fan upload', torrent: 'Torrent', other: 'Other copy' };

/** "41:25" when the grade note states a length; null otherwise (never guessed). */
export const lengthOf = (c) => c.grade_note?.match(/(\d{1,2}:\d{2}(?::\d{2})?) long/)?.[1] ?? null;

/** Embeddable player URL for a copy URL (YouTube no-cookie or archive.org), else null. */
export function embedOf(url, segment = null) {
  let u;
  try { u = new URL(url); } catch { return null; }
  const h = u.hostname.replace(/^www\./, '').replace(/^m\./, '');
  const id = h === 'youtube.com' ? u.searchParams.get('v') : h === 'youtu.be' ? u.pathname.slice(1) : null;
  if (id && /^[\w-]{11}$/.test(id)) {
    const start = segment ? segment.start.split(':').reduce((s, n) => s * 60 + Number(n), 0) : 0;
    return `https://www.youtube-nocookie.com/embed/${id}${start ? `?start=${start}` : ''}`;
  }
  const item = h === 'archive.org' && u.pathname.match(/^\/details\/([^/]+)/)?.[1];
  return item ? `https://archive.org/embed/${item}` : null;
}

/** "YouTube" or the host name, for "Open on ..." links. */
export const siteName = (url) => (['youtube.com', 'youtu.be'].includes(host(url)) ? 'YouTube' : host(url));
