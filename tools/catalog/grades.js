const ORDER = ['A', 'B', 'C', 'D'];
const GAP_FREE = ['A', 'B', 'C'];

/** 'A'|'B'|'C'|'D'|'X'|null for a game. X = known lost; null = no graded copy. */
export function bestGrade(game) {
  if (game.lost) return 'X';
  const grades = (game.copies ?? []).map((c) => c.grade).filter((g) => ORDER.includes(g));
  if (grades.length === 0) return null;
  return ORDER.find((g) => grades.includes(g));
}

/** A gap is a game with no copy graded A-C (derived, never stored). */
export function isGap(game) {
  return !GAP_FREE.includes(bestGrade(game));
}
