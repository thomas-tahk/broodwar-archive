import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseDocument } from 'yaml';
import { buildCopy, YAML_OUT } from '../tools/submit/build.js';

const FILES = ['2001-sky-osl/final', '2001-wcg/final'];

test('unedited parse -> toString of real match files is byte-identical', () => {
  for (const f of FILES) {
    const text = fs.readFileSync(`catalog/matches/${f}.yaml`, 'utf8');
    assert.equal(parseDocument(text).toString(YAML_OUT), text, f);
  }
});

test('adding one copy changes only the added lines', () => {
  for (const f of FILES) {
    const [event, match] = f.split('/');
    const before = fs.readFileSync(`catalog/matches/${f}.yaml`, 'utf8').split('\n');
    const set = parseDocument(before.join('\n')).getIn(['games', 0, 'set']);
    const v = { event_id: event, match_id: match, game_number: String(set), copy_link: 'https://example.com/v/zzz', copy_kind: 'fan-upload', copy_title: null, uploader: null, resolution: null, fps: null, segment_start: null, segment_end: null };
    const after = buildCopy(v, 'catalog').text.split('\n');
    // a one-line flow game that gains a copy is itself rewritten; nothing else may change
    assert.ok(before.filter((l) => !after.includes(l)).length <= 1, `${f}: at most one original line changes`);
    assert.ok(after.some((l) => l.includes('https://example.com/v/zzz')));
    const kept = before.filter((l) => !l.trimStart().startsWith('- {set:'));
    assert.ok(kept.every((l) => after.includes(l)), `${f}: untouched lines survive`);
  }
});
