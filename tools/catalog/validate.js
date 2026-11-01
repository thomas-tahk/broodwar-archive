#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { KINDS as FOLDER_KINDS, readCatalogFiles } from './load.js';
import { explain } from './messages.js';
import { crossFileErrors, misplacedFileErrors } from './rules.js';

const SCHEMA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../catalog/schema');
const KINDS = Object.values(FOLDER_KINDS);

const read = (name) => JSON.parse(fs.readFileSync(path.join(SCHEMA_DIR, name), 'utf8'));

function buildValidators() {
  const ajv = new Ajv({ allErrors: true, strict: true, allowUnionTypes: true });
  addFormats(ajv);
  ajv.addSchema(read('common.schema.json'));
  return Object.fromEntries(KINDS.map((k) => [k, ajv.compile(read(`${k}.schema.json`))]));
}

function schemaErrors(entry, validators) {
  if (entry.parseError) {
    return [{ file: entry.file, path: '(whole file)', message: `could not be read as YAML: ${entry.parseError}` }];
  }
  const validate = validators[entry.kind];
  if (validate(entry.data)) return [];
  return validate.errors.map((e) => ({ file: entry.file, ...explain(e) }));
}

function fieldSourceErrors(entry) {
  const sources = entry.data?.field_sources;
  if (!sources || typeof sources !== 'object' || Array.isArray(sources)) return [];
  const fields = Object.keys(read(`${entry.kind}.schema.json`).properties);
  return Object.keys(sources).filter((k) => !fields.includes(k)).map((k) => ({
    file: entry.file,
    path: 'field_sources',
    message: `field_sources: "${k}" is not a field of a ${entry.kind}`,
  }));
}

export function validateCatalog(dir) {
  const validators = buildValidators();
  const entries = readCatalogFiles(dir);
  const errors = [
    ...entries.flatMap((e) => schemaErrors(e, validators)),
    ...entries.flatMap(fieldSourceErrors),
    ...crossFileErrors(entries.filter((e) => !e.parseError)),
    ...misplacedFileErrors(dir),
  ];
  const count = (kind) => entries.filter((e) => e.kind === kind).length;
  return { errors, counts: { events: count('event'), matches: count('match'), players: count('player'), maps: count('map') } };
}

function main() {
  const dir = process.argv[2] ?? process.env.CATALOG_DIR ?? 'catalog';
  if (!fs.existsSync(dir)) {
    console.error(`${dir}: (folder): this folder does not exist`);
    process.exit(1);
  }
  const { errors, counts } = validateCatalog(dir);
  if (errors.length > 0) {
    for (const e of errors) console.error(`${path.join(dir, e.file)}: ${e.path}: ${e.message}`);
    console.error(`\n${errors.length} problem${errors.length === 1 ? '' : 's'} found.`);
    process.exit(1);
  }
  const { events, matches, players, maps } = counts;
  console.log(`OK: ${events} events, ${matches} matches, ${players} players, ${maps} maps`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
