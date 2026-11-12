import { execFileSync } from 'node:child_process';
import path from 'node:path';

/**
 * { fileId: ISO date the file was added in git } for the *.yaml files under itemsDir, one git call.
 * --no-renames makes a renamed file count as added at its rename commit (otherwise it has no add entry at all).
 * Empty when git history is unavailable.
 */
export function addedDates(cwd, itemsDir) {
  try {
    const log = execFileSync('git', ['log', '--no-renames', '--diff-filter=A', '--name-only', '--format=@%cI', '--', itemsDir],
      { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const dates = {};
    let when = null;
    for (const line of log.split('\n')) {
      if (line.startsWith('@')) when = line.slice(1);
      else if (line.endsWith('.yaml')) dates[path.basename(line, '.yaml')] = when; // later (older) commits overwrite
    }
    return dates;
  } catch {
    return {};
  }
}
