import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isNewer, releaseNotes } from '../tools/release-notes.js';

test('compara versiones número por número', () => {
  assert.ok(isNewer('3.6.1', '3.6.0'));
  assert.ok(isNewer('3.10.0', '3.9.9'));
  assert.ok(isNewer('4.0.0', '3.99.99'));
  assert.ok(!isNewer('3.6.0', '3.6.0'));
  assert.ok(!isNewer('3.5.9', '3.6.0'));
});

test('las novedades de version.json salen del CHANGELOG: la versión actual primero, con sus puntos principales', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)));
  const notes = releaseNotes(readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8'));
  assert.equal(notes[0].version, pkg.version, 'el CHANGELOG empieza por la versión de package.json');
  assert.ok(notes.length <= 5);
  for (const n of notes) {
    assert.ok(n.title && n.items.length, n.version);
    for (const i of n.items) assert.ok(!i.includes('**') && !i.startsWith('-'), i);
  }
});
