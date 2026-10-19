import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FACTS, PEOPLE, WELCOME } from '../src/data/lore.js';
import { ALL_STATIONS } from '../src/sim/legacy.js';
import { ZONE_LIST } from '../src/data/zones/index.js';

test('cada estación tiene al menos un dato real, corto (cabe en dos renglones del panel)', () => {
  for (const id of ALL_STATIONS) {
    assert.ok(FACTS[id]?.length, `falta el dato de ${id}`);
    for (const f of FACTS[id]) assert.ok(f.length <= 75, `${id}: «${f}» tiene ${f.length} letras`);
  }
});

test('cada zona tiene su persona y su bienvenida', () => {
  for (const z of ZONE_LIST) {
    assert.ok(PEOPLE[z.id]?.name, z.id);
    assert.ok(WELCOME[z.id], z.id);
  }
});
