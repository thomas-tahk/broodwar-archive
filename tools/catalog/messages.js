/** Turn an ajv error into { path, message } a non-coder can act on. */

export function formatPath(instancePath) {
  if (!instancePath) return '(whole file)';
  return instancePath.slice(1).split('/')
    .map((p) => (/^\d+$/.test(p) ? `[${p}]` : `.${p}`))
    .join('').replace(/^\./, '');
}

function describeType(type) {
  const list = [].concat(type).map((t) => (t === 'null' ? 'empty (null)' : t));
  return list.join(' or ');
}

function patternMessage(pattern) {
  if (pattern.includes('https?')) return 'must be a web link starting with http:// or https://';
  if (pattern.includes('(event|player|map)') || pattern.includes('(series|event|player|map|item)')) {
    return 'must look like "player:boxer", "event:2001-sky-osl", "map:incubus" or "match:<event-id>/<match-id>" (series: and item: are allowed only in featured.yaml)';
  }
  if (pattern.includes('a-z0-9-')) return 'may only use lowercase letters a-z, digits 0-9 and "-" (no spaces or capitals)';
  if (pattern.includes('\\d{4}-')) return 'must be a date written YYYY-MM-DD (e.g. 2001-08-10), or null if unknown';
  if (pattern.includes('\\d{2}:')) return 'must be a time written HH:MM:SS (e.g. 00:47:10)';
  return `is not in the expected format (${pattern})`;
}

const NEVER_NULL = ['url', 'sources', 'id', 'name', 'start', 'end', 'completeness', 'tier', 'kind', 'tags', 'urls', 'links'];

function missingMessage(field) {
  const hint = NEVER_NULL.includes(field) ? '' : ' (write null if the value is unknown)';
  return `this field is missing. Add "${field}:"${hint}`;
}

function typeMessage(e) {
  if (e.instancePath === '/version') return 'must be text. Put it in quotes, e.g. "1.1"';
  const type = [].concat(e.params.type);
  if (!e.instancePath && type.includes('object')) return 'file is empty or not a set of fields (key: value lines)';
  if (type.length === 1 && type[0] === 'array') return 'must be a list (each item on its own line starting with "- ")';
  if (type.length === 1 && type[0] === 'object') return 'must be a set of fields (key: value lines), e.g. "url: https://..."';
  return `must be ${describeType(e.params.type)}`;
}

const BUILDERS = {
  required: (e) => ({
    path: formatPath(`${e.instancePath}/${e.params.missingProperty}`),
    message: missingMessage(e.params.missingProperty),
  }),
  additionalProperties: (e) => ({
    path: formatPath(`${e.instancePath}/${e.params.additionalProperty}`),
    message: `"${e.params.additionalProperty}" is not a recognised field. Check the spelling or remove it`,
  }),
  enum: (e) => ({
    path: formatPath(e.instancePath),
    message: `must be one of: ${e.params.allowedValues.map((v) => (v === null ? 'null' : v)).join(', ')}`,
  }),
  type: (e) => ({
    path: formatPath(e.instancePath),
    message: typeMessage(e),
  }),
  format: (e) => ({
    path: formatPath(e.instancePath),
    message: e.params.format === 'date'
      ? 'is not a real calendar date. Write it as YYYY-MM-DD (e.g. 2001-08-10), or null if unknown'
      : `is not a valid ${e.params.format}`,
  }),
  pattern: (e) => ({ path: formatPath(e.instancePath), message: patternMessage(e.params.pattern) }),
  minItems: (e) => ({
    path: formatPath(e.instancePath),
    message: e.instancePath.endsWith('sources')
      ? 'needs at least one source. Add an entry like "- url: https://..." saying where this came from'
      : `needs at least ${e.params.limit} entries`,
  }),
  maxItems: (e) => ({ path: formatPath(e.instancePath), message: `can have at most ${e.params.limit} entries` }),
  minLength: (e) => ({ path: formatPath(e.instancePath), message: 'must not be empty' }),
  minimum: (e) => ({ path: formatPath(e.instancePath), message: `must be at least ${e.params.limit}` }),
  maximum: (e) => ({ path: formatPath(e.instancePath), message: `must be at most ${e.params.limit}` }),
  exclusiveMinimum: (e) => ({ path: formatPath(e.instancePath), message: `must be greater than ${e.params.limit}` }),
};

export function explain(error) {
  const build = BUILDERS[error.keyword];
  if (build) return build(error);
  return { path: formatPath(error.instancePath), message: error.message };
}
