// Pure home-page logic: no catalog or filesystem access, so tests can call it directly.

export { itemYear } from '../../tools/catalog/itemYear.js';

/**
 * Newest first by the date the item file was added (ISO strings in `addedAt`, keyed by item id).
 * Items with no known date (no git history, or not committed yet) count as newest, in reverse file order.
 */
export function sortLatest(items, addedAt) {
  const ordered = [...items].reverse();
  const unknown = ordered.filter((i) => !addedAt[i.id]);
  const known = ordered.filter((i) => addedAt[i.id]).sort((a, b) => Date.parse(addedAt[b.id]) - Date.parse(addedAt[a.id]));
  return [...unknown, ...known];
}

/** Timeline years descending, unknown last. Input: [{ year: number|null, ... }]. */
export const sortYears = (years) =>
  [...years].sort((a, b) => (a.year === null) - (b.year === null) || (b.year ?? 0) - (a.year ?? 0));

/** Featured cards for refs that resolve; dangling refs are skipped. `describe(hit)` gives { label, href } or null. */
export function featuredFrom(featured, resolve, describe) {
  return featured.flatMap(({ ref, blurb }) => {
    const hit = resolve(ref);
    const d = hit && describe(hit);
    return d ? [{ type: hit.type, label: d.label, href: d.href, blurb: blurb ?? null }] : [];
  });
}
