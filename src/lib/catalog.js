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

export function playerOf(id) {
  return players.get(id) ?? { id, name: null, hangul: null, race: null };
}

export function host(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

/** Link to a page inside the site, through the base. */
export function href(p) {
  return `${import.meta.env.BASE_URL.replace(/\/$/, '')}/${p}`.replace(/\/+$/, '/');
}

/** "Round of 8 · Group A" style stage line for a match. */
export const stageOf = (m) => [m.stage ?? 'Stage unknown', m.group && `Group ${m.group}`].filter(Boolean).join(' · ');
