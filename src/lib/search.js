// Pure search over the prebuilt record list (/find/records.json). The ONLY seam the Find page uses:
// swap the body for Pagefind later without touching the UI. No DOM, no fetch.

/** Facet name -> record field. OR within one facet, AND across facets. */
export const FACETS = {
  kind: 'kind', year: 'year', tier: 'tier', league: 'league',
  player: 'players', matchup: 'matchup', map: 'map', grade: 'grade',
};

/** Lowercase, strip diacritics. */
export const normalize = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const valuesOf = (record, facet) => {
  const v = record[FACETS[facet]];
  return (Array.isArray(v) ? v : [v]).filter((x) => x != null).map(String);
};
const passes = (record, selection, facet) => {
  const want = (selection?.[facet] ?? []).map(String);
  return want.length === 0 || valuesOf(record, facet).some((v) => want.includes(v));
};

/**
 * createSearch(records) -> search(query, selection) -> { results, counts }.
 * selection: { kind, year, tier, league, player, matchup, map, grade } each an optional array of values.
 * counts[facet][value] = results if that value were picked in its own facet, other facets as selected
 * (so picking more than one value in a facet widens it, the usual faceted-search count).
 * counts.total = results.length. Values in the catalog that match nothing count 0.
 */
export function createSearch(records) {
  const facets = Object.keys(FACETS);
  const haystacks = records.map((r) => normalize([r.title, ...(r.names ?? []).filter(Boolean), ...(r.aka ?? []), r.eventName, r.mapName].filter(Boolean).join(' ')));
  const zero = Object.fromEntries(facets.map((f) => [f, {}]));
  for (const r of records) for (const f of facets) for (const v of valuesOf(r, f)) zero[f][v] = 0;

  return function search(query = '', selection = {}) {
    const tokens = normalize(query).split(/\s+/).filter(Boolean);
    const counts = Object.fromEntries(facets.map((f) => [f, { ...zero[f] }]));
    const results = [];
    records.forEach((r, i) => {
      if (!tokens.every((t) => haystacks[i].includes(t))) return;
      const failing = facets.filter((f) => !passes(r, selection, f));
      if (failing.length > 1) return;
      if (failing.length === 0) results.push(r);
      for (const f of facets) {
        if (failing.length === 1 && failing[0] !== f) continue;
        for (const v of valuesOf(r, f)) counts[f][v] += 1;
      }
    });
    counts.total = results.length;
    return { results, counts };
  };
}

const PARAM_OF = { kind: 'kind', year: 'year', tier: 'tier', league: 'league', player: 'player', matchup: 'mu', map: 'map', grade: 'grade' };

/** URLSearchParams -> { query, selection }. Unknown params are ignored. */
export function fromParams(params) {
  const selection = {};
  for (const [facet, key] of Object.entries(PARAM_OF)) {
    const list = (params.get(key) ?? '').split(',').filter(Boolean);
    if (list.length) selection[facet] = list;
  }
  return { query: params.get('q') ?? '', selection };
}

/** (query, selection) -> URLSearchParams; empty parts omitted. */
export function toParams(query, selection) {
  const params = new URLSearchParams();
  if (query.trim()) params.set('q', query.trim());
  for (const [facet, key] of Object.entries(PARAM_OF)) {
    if (selection[facet]?.length) params.set(key, selection[facet].join(','));
  }
  return params;
}
