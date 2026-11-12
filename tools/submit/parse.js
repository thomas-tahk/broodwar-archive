import { FORMS } from './forms.js';

export class SubmissionError extends Error {}

/** Issue-form body -> {label: value|null}. Throws SubmissionError if it is not an issue-form body. */
export function parseBody(body) {
  const text = String(body ?? '').replace(/\r\n/g, '\n');
  const parts = text.split(/^### +(.+?) *$/m);
  if (parts.length < 3) throw new SubmissionError('This does not look like a submission form: no "### Heading" sections found.');
  const fields = {};
  for (let i = 1; i < parts.length; i += 2) {
    const value = parts[i + 1].trim();
    fields[parts[i]] = value === '' || value === '_No response_' ? null : value;
  }
  return fields;
}

/** Which form produced these headings? Matches on the exact set of labels. */
export function detectForm(fields) {
  const headings = Object.keys(fields).sort().join('|');
  for (const [kind, form] of Object.entries(FORMS)) {
    if (form.fields.map((f) => f.label).sort().join('|') === headings) return kind;
  }
  throw new SubmissionError(`These headings do not match any submission form: ${Object.keys(fields).join(', ')}.`);
}

/** {label: value} -> {fieldId: value}, rejecting empty required fields and bad dropdown picks. All problems reported together. */
export function readFields(kind, byLabel) {
  const values = {};
  const problems = [];
  for (const f of FORMS[kind].fields) {
    const v = byLabel[f.label] ?? null;
    if (v === null && f.required) problems.push(`"${f.label}" is required but empty.`);
    else if (v !== null && f.options && !f.options.includes(v)) problems.push(`"${f.label}" must be one of: ${f.options.join(', ')}. Got "${v}".`);
    values[f.id] = v;
  }
  if (problems.length > 0) throw new SubmissionError(problems.join('\n'));
  return values;
}
