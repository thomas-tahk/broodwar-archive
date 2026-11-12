import { BUILDERS } from './build.js';
import { detectForm, parseBody, readFields } from './parse.js';

export { SubmissionError } from './parse.js';

/** Issue body -> {kind, file, text}. file is relative to catalogDir. Throws SubmissionError with a message fit to post on the issue. */
export function processSubmission(body, catalogDir) {
  const byLabel = parseBody(body);
  const kind = detectForm(byLabel);
  const values = readFields(kind, byLabel);
  return { kind, ...BUILDERS[kind](values, catalogDir) };
}
