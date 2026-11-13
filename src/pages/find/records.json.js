// Build-time search data: every game and item as one flat JSON list (see src/lib/search.js).
import path from 'node:path';
import { loadCatalog } from '../../../tools/catalog/load.js';
import { buildRecords } from '../../../tools/search/records.js';

export function GET() {
  const dir = path.resolve(process.cwd(), process.env.CATALOG_DIR || 'catalog');
  return new Response(JSON.stringify(buildRecords(loadCatalog(dir))), { headers: { 'Content-Type': 'application/json' } });
}
