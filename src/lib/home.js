import path from 'node:path';
import { events, items, series, featured, resolveRef, href, nameOf } from './catalog.js';
import { addedDates } from './gitDates.js';
import { itemYear, sortLatest, sortYears, featuredFrom } from './homeLogic.js';

/** Series that have at least one tier-big event, by name. */
export const leagueMenu = () =>
  [...series.values()]
    .filter((s) => events.some((e) => e.series === s.id && e.tier === 'big'))
    .sort((a, b) => a.name.localeCompare(b.name));

/** Where a ref lives on the site. Series/items pages come from other issues. */
export function refHref(type, record) {
  if (type === 'match') return href(`matches/${record.event}/${record.id}/`);
  const dir = { series: 'series', event: 'events', item: 'items', player: 'players', map: 'maps' }[type];
  return dir ? href(`${dir}/${record.id}/`) : null;
}

/** Name to show for any resolved record; matches read "<p1> vs <p2> · <event name>". */
export function labelOf(type, r) {
  if (type !== 'match') return r.name ?? r.title ?? r.id;
  const eventName = events.find((e) => e.id === r.event)?.name ?? r.event;
  return `${nameOf(r.players?.[0])} vs ${nameOf(r.players?.[1])} · ${eventName}`;
}

export const featuredCards = () =>
  featuredFrom(featured, resolveRef, ({ type, record }) => {
    const link = refHref(type, record);
    return link && { label: labelOf(type, record), href: link };
  });

/** [{ year (number|null), bands: [big events], chips: [...] }], years descending, unknown last. */
export function timeline() {
  const years = new Map();
  const slot = (y) => { if (!years.has(y)) years.set(y, { year: y, bands: [], chips: [] }); return years.get(y); };
  for (const e of events) {
    const entry = { label: e.name, href: href(`events/${e.id}/`), kind: 'event' };
    const y = slot(e.year ?? null);
    (e.tier === 'big' ? y.bands : y.chips).push(entry);
  }
  for (const i of items) slot(itemYear(i, resolveRef)).chips.push({ label: i.title, href: href(`items/${i.id}/`), kind: i.kind });
  return sortYears([...years.values()]);
}

/** { itemId: ISO date the item file was added in git }, one git call. Empty when git history is unavailable. */
export function itemAddedDates() {
  const dir = path.relative(process.cwd(), path.resolve(process.cwd(), process.env.CATALOG_DIR || 'catalog'));
  return addedDates(process.cwd(), path.join(dir, 'items'));
}

/** Newest-added first, items only, max 6. */
export const latestAdditions = () =>
  sortLatest(items, itemAddedDates()).slice(0, 6).map((i) => ({ label: i.title, kind: i.kind, href: href(`items/${i.id}/`) }));
