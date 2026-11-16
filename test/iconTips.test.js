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

test('icon names: once the special zone has opened, its products and stations have names too (v5.9.1)', () => {
  for (const p of Object.values(PRODUCTS)) if (p.zone === 'sanandres') assert.ok(iconName(p.icon, true)?.includes(p.name), `${p.name} (${p.icon})`);
  const products = new Set(Object.values(PRODUCTS).map((p) => p.icon.replace(/️/g, '')));
  for (const s of STATIONS) if (s.zone === 'sanandres' && !products.has(s.icon.replace(/️/g, ''))) assert.ok(iconName(s.icon, true)?.includes(s.name), `${s.name} (${s.icon})`);
  assert.equal(iconName('💰', true), 'Monedas');
});
