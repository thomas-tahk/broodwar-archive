// Help-wanted gaps (issue #17). Pure: derived from events + matches, nothing stored.
import { copyCount } from './catalog.js';

const TIER_RANK = { big: 0, mid: 1, small: 2 };
/** The site's one place that maps a help action to an issue template and the fields to prefill from a record ("event" or "event/match").
 *  Template names and field ids are copied from tools/submit/forms.js (kept out of the site bundle); test/help.test.js fails if they drift. */
const split = (recordId) => { const [event, match] = recordId.split('/'); return { event, match }; };
export const FORMS = {
  copy: { template: 'submit-copy.yml', fields: (recordId, game) => { const { event, match } = split(recordId); return { event_id: event, match_id: match, ...(game ? { game_number: String(game) } : {}) }; } },
  info: { template: 'submit-fix.yml', fields: (recordId) => ({ record: `${recordId.includes('/') ? 'match' : 'event'}:${recordId}` }) },
  addmatch: { template: 'submit-match.yml', fields: (recordId) => ({ event_id: split(recordId).event }) },
};
export const GAP_TYPES = [
  { key: 'event', title: 'Events with missing results or details', form: 'info' },
  { key: 'match', title: 'Matches with missing results or details', form: 'info' },
  { key: 'nocopy', title: 'Matches with no known copy', form: 'copy' },
  { key: 'nofields', title: 'Matches missing a date, winner or score', form: 'info' },
];

const unfinished = (r) => r.completeness !== 'complete';
const missingFields = (m) => [!m.date && 'date', !m.winner && 'winner', !m.score && 'score'].filter(Boolean);

/** Issue-form URL: title prefilled with the record id, plus the form's fields. `game` (optional) prefills the copy form's game number. */
export function formUrl(repoUrl, form, { recordId, game }) {
  const f = FORMS[form];
  const q = new URLSearchParams({ template: f.template, title: `[${recordId}] `, ...f.fields(recordId, game) });
  return `${repoUrl}/issues/new?${q}`;
}

/** Plain-words list of what a record page is missing. Each item: { text, form, game?, label }. Empty when nothing is. */
export function missingItems(rec, eventMatches = []) {
  const items = [];
  if (unfinished(rec)) {
    const why = { stub: 'Only a stub so far: results and details are mostly unfilled.', partial: 'Partly filled in: some results or details are still missing.' };
    items.push({ text: why[rec.completeness] ?? 'Results or details are incomplete.', form: 'info', label: 'Help fill this' });
  }
  if (rec.event) {
    const miss = missingFields(rec);
    if (miss.length && !unfinished(rec)) items.push({ text: `Missing ${miss.join(', ')}.`, form: 'info', label: 'Help fill this' });
    for (const g of rec.games.filter((x) => !x.lost && !(x.copies ?? []).length)) {
      items.push({ text: `Game ${g.set} has no known copy.`, form: 'copy', game: g.set, label: `Add a copy of game ${g.set}` });
    }
    return items;
  }
  const missing = rec.expected_games != null ? rec.expected_games - eventMatches.reduce((n, m) => n + m.games.length, 0) : 0;
  if (missing > 0) items.push({ text: `${missing} expected ${missing === 1 ? 'game is' : 'games are'} not catalogued yet.`, form: 'addmatch', label: 'Add a missing match' });
  else if (unfinished(rec)) items.push({ text: 'Some matches may not be catalogued yet.', form: 'addmatch', label: 'Add a missing match' });
  return items;
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
