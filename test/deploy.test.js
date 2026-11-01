import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import YAML from 'yaml';

const workflow = (name) => YAML.parse(fs.readFileSync(`.github/workflows/${name}`, 'utf8'));
const runs = (wf) => Object.values(wf.jobs).flatMap((j) => j.steps.map((s) => s.run).filter(Boolean));

test('pages.yml triggers only on push to main and workflow_dispatch', () => {
  const on = workflow('pages.yml').on;
  assert.deepEqual(Object.keys(on).sort(), ['push', 'workflow_dispatch']);
  assert.deepEqual(on.push.branches, ['main']);
});

test('ci.yml runs on push and pull_request, with validate, test, build', () => {
  const wf = workflow('ci.yml');
  assert.ok('push' in wf.on && 'pull_request' in wf.on);
  const cmds = runs(wf);
  for (const c of ['npm run validate', 'npm test', 'npm run build']) {
    assert.ok(cmds.includes(c), c);
  }
});

const htmlFiles = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? htmlFiles(p) : p.endsWith('.html') ? [p] : [];
  });

test('default-catalog build emits only base-prefixed root-relative URLs', () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'bw-dist-'));
  execSync(`npm run build -- --outDir ${out}`, { stdio: 'pipe' });
  assert.ok(fs.existsSync(path.join(out, 'index.html')));
  const bad = [];
  for (const f of htmlFiles(out)) {
    for (const m of fs.readFileSync(f, 'utf8').matchAll(/\b(?:href|src)="(\/[^"]*)"/g)) {
      if (!m[1].startsWith('/broodwar-archive/')) bad.push(`${f}: ${m[1]}`);
    }
  }
  assert.deepEqual(bad, []);
});
