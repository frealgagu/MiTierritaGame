import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CHANGELOGS, isNewer, releaseNotes } from '../tools/release-notes.js';

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const versions = (file) => [...read(file).matchAll(/^## v(\d+\.\d+\.\d+)/gm)].map((m) => m[1]);

test('compares versions number by number', () => {
  assert.ok(isNewer('3.6.1', '3.6.0'));
  assert.ok(isNewer('3.10.0', '3.9.9'));
  assert.ok(isNewer('4.0.0', '3.99.99'));
  assert.ok(!isNewer('3.6.0', '3.6.0'));
  assert.ok(!isNewer('3.5.9', '3.6.0'));
});

test('version.json notes come from each CHANGELOG: the current version first, with its main points', () => {
  const pkg = JSON.parse(read('package.json'));
  for (const [lang, file] of Object.entries(CHANGELOGS)) {
    const notes = releaseNotes(read(file));
    assert.equal(notes[0].version, pkg.version, `${file} starts with the package.json version`);
    assert.ok(notes.length <= 5);
    for (const n of notes) {
      assert.ok(n.title && n.items.length, `${lang} ${n.version}`);
      for (const i of n.items) assert.ok(!i.includes('**') && !i.startsWith('-'), i);
    }
  }
});

test('every CHANGELOG lists the same versions in the same order', () => {
  const en = versions(CHANGELOGS.en);
  assert.ok(en.length > 100);
  for (const file of Object.values(CHANGELOGS)) assert.deepEqual(versions(file), en, file);
});
