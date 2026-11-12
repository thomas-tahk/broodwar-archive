// One definition of "what year does this item belong to", shared by the home timeline and the search index.

/** Item's own date, else the year of the first event/match it is from, about or features (match: its date, else its event's year); null if none. */
export function itemYear(item, resolve) {
  if (item.date) return Number(item.date.slice(0, 4));
  const { from = [], about = [], features = [] } = item.links ?? {};
  for (const ref of [...from, ...about, ...features]) {
    const hit = resolve(ref);
    if (hit?.type === 'event' && hit.record.year) return hit.record.year;
    if (hit?.type === 'match') {
      if (hit.record.date) return Number(hit.record.date.slice(0, 4));
      const ev = resolve(`event:${hit.record.event}`);
      if (ev?.record.year) return ev.record.year;
    }
  }
  return null;
}
