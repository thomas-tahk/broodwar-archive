import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';

export const KINDS = { events: 'event', matches: 'match', players: 'player', maps: 'map', series: 'series', items: 'item' };
const FEATURED_FILE = 'featured.yaml';

function listYaml(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.yaml'))
    .map((e) => path.join(dir, e.name))
    .sort();
}

function subdirs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => path.join(dir, e.name))
    .sort();
}

function filesFor(dir, folder) {
  const base = path.join(dir, folder);
  if (folder === 'matches') return subdirs(base).flatMap(listYaml);
  return listYaml(base);
}

function readEntry(dir, folder, file) {
  const entry = { file: path.relative(dir, file), folder, kind: KINDS[folder] };
  try {
    entry.data = parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    entry.parseError = err.message.split('\n')[0];
  }
  return entry;
}

/** Every YAML file in the catalog with its parsed data (or parseError). Used by the validator. */
export function readCatalogFiles(dir) {
  const featured = path.join(dir, FEATURED_FILE);
  const entries = Object.keys(KINDS).flatMap((folder) =>
    filesFor(dir, folder).map((file) => readEntry(dir, folder, file)));
  if (fs.existsSync(featured)) entries.push({ ...readEntry(dir, 'featured', featured), kind: 'featured' });
  return entries;
}

/** Plain arrays of parsed objects (featured: the ordered {ref, blurb} list). Matches get fullId "<event>/<id>". Throws on unreadable YAML. */
export function loadCatalog(dir) {
  const out = { events: [], matches: [], players: [], maps: [], series: [], items: [], featured: [] };
  for (const entry of readCatalogFiles(dir)) {
    if (entry.parseError) throw new Error(`${entry.file}: ${entry.parseError}`);
    if (entry.folder === 'featured') { out.featured = entry.data?.featured ?? []; continue; }
    const item = entry.folder === 'matches'
      ? { ...entry.data, fullId: `${entry.data.event}/${entry.data.id}` }
      : entry.data;
    out[entry.folder].push(item);
  }
  return out;
}
