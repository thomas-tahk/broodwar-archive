#!/usr/bin/env node
// CLI for the submit workflow. Input via env only (the issue body is untrusted):
//   ISSUE_BODY, optional CATALOG_DIR (default "catalog"), RESULT_FILE (markdown comment text), GITHUB_OUTPUT.
// Writes the catalog file, validates, and reports status=ok|invalid|rejected. Always exits 0 on a judged outcome.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateCatalog } from '../catalog/validate.js';
import { processSubmission, SubmissionError } from './index.js';

const RETRY = 'Edit the issue, then ask a maintainer to remove and re-apply the `accepted-submission` label.';

export function run(body, catalogDir) {
  let result;
  try {
    result = processSubmission(body, catalogDir);
  } catch (err) {
    if (!(err instanceof SubmissionError)) throw err;
    return { status: 'rejected', comment: `Could not read this submission:\n\n${err.message}\n\n${RETRY}` };
  }
  const target = path.join(catalogDir, result.file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, result.text);
  const { errors } = validateCatalog(catalogDir);
  if (errors.length === 0) {
    return { ...result, status: 'ok', comment: `Validator passed for \`catalog/${result.file}\`. A pull request will be opened for the maintainer to review.` };
  }
  const list = errors.map((e) => `- \`${e.file}\` ${e.path}: ${e.message}`).join('\n');
  return { ...result, status: 'invalid', comment: `The validator found problems with \`catalog/${result.file}\`:\n\n${list}\n\n${RETRY}` };
}

function main() {
  const catalogDir = process.env.CATALOG_DIR || 'catalog';
  const out = run(process.env.ISSUE_BODY ?? '', catalogDir);
  fs.writeFileSync(process.env.RESULT_FILE || 'submit-result.md', `${out.comment}\n`);
  const lines = [`status=${out.status}`, `kind=${out.kind ?? ''}`, `file=${out.file ? `catalog/${out.file}` : ''}`];
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${lines.join('\n')}\n`);
  console.log(lines.join('\n'));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
