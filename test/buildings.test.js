import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ZONE_LIST } from '../src/data/zones/index.js';

// Every plot station needs its drawing in render/Buildings.js (DRAW[id], or an alias DRAW.id = DRAW.other); without one its lot shows up empty.
// Read as text so the test does not load the renderer.
test('every station with a lot has its drawing', () => {
  const src = readFileSync(new URL('../src/render/Buildings.js', import.meta.url), 'utf8');
  const body = src.slice(src.indexOf('const DRAW = {'));
  const missing = ZONE_LIST.flatMap((z) => z.plots.map((p) => p.stationId)).filter((id) => !new RegExp(`^(  (${id}|'${id}')\\(g, x, y|DRAW\\.${id} = DRAW\\.)`, 'm').test(body));
  assert.deepEqual(missing, []);
});
