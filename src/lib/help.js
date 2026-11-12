// Help-wanted gaps (issue #17). Pure: derived from events + matches, nothing stored.
import { copyCount } from './catalog.js';

const TIER_RANK = { big: 0, mid: 1, small: 2 };
const FORM = { copy: 'new-copy.yml', info: 'wrong-info.yml' };
export const GAP_TYPES = [
  { key: 'event', title: 'Events with missing results or details', form: 'info' },
  { key: 'match', title: 'Matches with missing results or details', form: 'info' },
  { key: 'nocopy', title: 'Matches with no known copy', form: 'copy' },
  { key: 'nodate', title: 'Matches missing a date, winner or score', form: 'info' },
];

const unfinished = (r) => r.completeness !== 'complete';
const missingFields = (m) => [!m.date && 'date', !m.winner && 'winner', !m.score && 'score'].filter(Boolean);

/** GitHub issue-form URL with the title prefilled with the record id. */
export function formUrl(repoUrl, form, recordId) {
  return `${repoUrl}/issues/new?template=${FORM[form]}&title=${encodeURIComponent(`[${recordId}] `)}`;
}

/** One row per gap, sorted big tier first, then year (oldest first), then record id. */
export function helpRows(events, matches) {
  const byEvent = new Map(events.map((e) => [e.id, e]));
  const rows = [];
  const add = (type, e, rec, detail) => rows.push({
    type, tier: e.tier, year: e.year ?? 0, event: e.id, id: rec.id,
    recordId: rec.event ? `${rec.event}/${rec.id}` : rec.id, isMatch: Boolean(rec.event), rec, detail,
  });
  for (const e of events) if (unfinished(e)) add('event', e, e, e.completeness);
  for (const m of matches) {
    const e = byEvent.get(m.event);
    if (!e) continue;
    if (unfinished(m)) add('match', e, m, m.completeness);
    if (copyCount(m) === 0) add('nocopy', e, m, 'no copy known');
    const miss = missingFields(m);
    if (miss.length) add('nodate', e, m, `missing ${miss.join(', ')}`);
  }
  return rows.sort((a, b) => (TIER_RANK[a.tier] ?? 9) - (TIER_RANK[b.tier] ?? 9) || a.year - b.year || a.recordId.localeCompare(b.recordId));
}
