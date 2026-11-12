import { events, items, series, featured, resolveRef, href } from './catalog.js';

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

/** Name to show for any resolved record. */
export const labelOf = (type, r) => r.name ?? r.title ?? (type === 'match' ? r.fullId : r.id);

/** Featured picks that resolve to a record, in file order; dangling refs are skipped. */
export function featuredCards() {
  return featured.flatMap(({ ref, blurb }) => {
    const hit = resolveRef(ref);
    const link = hit && refHref(hit.type, hit.record);
    return link ? [{ type: hit.type, label: labelOf(hit.type, hit.record), blurb: blurb ?? null, href: link }] : [];
  });
}

const yearOfItem = (item) => {
  if (item.date) return Number(item.date.slice(0, 4));
  const from = (item.links?.from ?? []).map((r) => resolveRef(r)).find((h) => h?.type === 'event' && h.record.year);
  return from ? from.record.year : null;
};

/** [{ year (number|null), bands: [big events], chips: [...] }], years descending, unknown last. */
export function timeline() {
  const years = new Map();
  const slot = (y) => { if (!years.has(y)) years.set(y, { year: y, bands: [], chips: [] }); return years.get(y); };
  for (const e of events) {
    const entry = { label: e.name, href: href(`events/${e.id}/`), kind: 'event' };
    const y = slot(e.year ?? null);
    (e.tier === 'big' ? y.bands : y.chips).push(entry);
  }
  for (const i of items) slot(yearOfItem(i)).chips.push({ label: i.title, href: href(`items/${i.id}/`), kind: i.kind });
  return [...years.values()].sort((a, b) => (a.year === null) - (b.year === null) || (b.year ?? 0) - (a.year ?? 0));
}

/** Newest first. Guess: file order (loader order, later = newer), items only, max 6. */
export const latestAdditions = () =>
  [...items].reverse().slice(0, 6).map((i) => ({ label: i.title, kind: i.kind, href: href(`items/${i.id}/`) }));
