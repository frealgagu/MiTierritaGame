import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FACTS, PEOPLE, WELCOME } from '../src/data/lore.js';
import { ALL_STATIONS } from '../src/sim/legacy.js';
import { ZONE_LIST } from '../src/data/zones/index.js';

test('every station has at least one real fact, short (it fits in two lines of the panel)', () => {
  for (const id of ALL_STATIONS) {
    assert.ok(FACTS[id]?.length, `the fact for ${id} is missing`);
    for (const f of FACTS[id]) assert.ok(f.length <= 75, `${id}: «${f}» has ${f.length} characters`);
  }
});

test('every zone has its person and its welcome', () => {
  for (const z of ZONE_LIST) {
    assert.ok(PEOPLE[z.id]?.name, z.id);
    assert.ok(WELCOME[z.id], z.id);
  }
});
