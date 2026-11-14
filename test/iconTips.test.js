import test from 'node:test';
import assert from 'node:assert/strict';
import { iconName } from '../src/ui/iconTips.js';
import { PRODUCTS } from '../src/data/products.js';
import { STATIONS } from '../src/data/stations.js';

test('icon names: every product is recognized by its icon', () => {
  for (const p of Object.values(PRODUCTS)) if (p.zone !== 'sanandres') assert.ok(iconName(p.icon)?.includes(p.name), `${p.name} (${p.icon})`);
});

test('icon names: nothing from the special zone, which is secret (v5.4)', () => {
  for (const p of Object.values(PRODUCTS)) if (p.zone === 'sanandres') assert.ok(!iconName(p.icon)?.includes(p.name), `${p.name} (${p.icon})`);
  for (const s of STATIONS) if (s.zone === 'sanandres') assert.ok(!iconName(s.icon)?.includes(s.name), `${s.name} (${s.icon})`);
});

test('icon names: the interface ones, with or without a variant selector', () => {
  assert.equal(iconName('💰'), 'Monedas');
  assert.equal(iconName('🗺️'), 'Zonas');
  assert.equal(iconName('🗺'), 'Zonas');
  assert.equal(iconName('🏆'), 'Prestigio: todo el Renombre ganado');
  assert.equal(iconName('⬆'), 'Todo al nivel máximo');
  assert.equal(iconName('⏱'), 'Reloj del evento');
  assert.equal(iconName('a'), null);
});
