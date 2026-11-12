// Help-wanted gaps (issue #17). Pure: derived from events + matches, nothing stored.
import { copyCount } from './catalog.js';

const TIER_RANK = { big: 0, mid: 1, small: 2 };
/** The ONE place that names the issue forms: template file, the form field id to prefill, and which record value goes in it. */
export const FORMS = {
  copy: { template: 'submit-copy.yml', field: 'match_id', value: 'recordId' },
  info: { template: 'submit-fix.yml', field: 'record', value: 'recordId' },
};
export const GAP_TYPES = [
  { key: 'event', title: 'Events with missing results or details', form: 'info' },
  { key: 'match', title: 'Matches with missing results or details', form: 'info' },
  { key: 'nocopy', title: 'Matches with no known copy', form: 'copy' },
  { key: 'nofields', title: 'Matches missing a date, winner or score', form: 'info' },
];

const unfinished = (r) => r.completeness !== 'complete';
const missingFields = (m) => [!m.date && 'date', !m.winner && 'winner', !m.score && 'score'].filter(Boolean);

/** GitHub issue-form URL: title prefilled with the record id, plus the form's required field. */
export function formUrl(repoUrl, form, { recordId, pageUrl }) {
  const f = FORMS[form];
  const q = new URLSearchParams({ template: f.template, title: `[${recordId}] `, [f.field]: { recordId, pageUrl }[f.value] });
  return `${repoUrl}/issues/new?${q}`;
}

/** One row per gap, sorted big tier first, then year (oldest first), then record id. */
export function helpRows(events, matches) {
  const byEvent = new Map(events.map((e) => [e.id, e]));
  const rows = [];
  const add = (type, e, rec, detail) => rows.push({
    type, tier: e.tier, year: e.year, event: e.id, id: rec.id,
    recordId: rec.fullId ?? rec.id, isMatch: Boolean(rec.event), rec, detail,
  });
  for (const e of events) if (unfinished(e)) add('event', e, e, e.completeness);
  for (const m of matches) {
    const e = byEvent.get(m.event);
    const miss = missingFields(m);
    if (unfinished(m)) add('match', e, m, m.completeness);
    else if (miss.length) add('nofields', e, m, `missing ${miss.join(', ')}`);
    if (copyCount(m) === 0 && !m.games.every((g) => g.lost)) add('nocopy', e, m, 'no copy known');
  }
  return rows.sort((a, b) => TIER_RANK[a.tier] - TIER_RANK[b.tier] || a.year - b.year || a.recordId.localeCompare(b.recordId));
}
