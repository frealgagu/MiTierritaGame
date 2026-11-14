import test from 'node:test';
import assert from 'node:assert/strict';
import { iconName } from '../src/ui/iconTips.js';
import { PRODUCTS } from '../src/data/products.js';
import { STATIONS } from '../src/data/stations.js';

test('nombres de íconos: cada producto se reconoce por su ícono', () => {
  for (const p of Object.values(PRODUCTS)) if (p.zone !== 'sanandres') assert.ok(iconName(p.icon)?.includes(p.name), `${p.name} (${p.icon})`);
});

test('nombres de íconos: nada de la zona especial, que es secreta (v5.4)', () => {
  for (const p of Object.values(PRODUCTS)) if (p.zone === 'sanandres') assert.ok(!iconName(p.icon)?.includes(p.name), `${p.name} (${p.icon})`);
  for (const s of STATIONS) if (s.zone === 'sanandres') assert.ok(!iconName(s.icon)?.includes(s.name), `${s.name} (${s.icon})`);
});

test('nombres de íconos: los de la interfaz, con o sin selector de variante', () => {
  assert.equal(iconName('💰'), 'Monedas');
  assert.equal(iconName('🗺️'), 'Zonas');
  assert.equal(iconName('🗺'), 'Zonas');
  assert.equal(iconName('🏆'), 'Prestigio: todo el Renombre ganado');
  assert.equal(iconName('⬆'), 'Todo al nivel máximo');
  assert.equal(iconName('⏱'), 'Reloj del evento');
  assert.equal(iconName('a'), null);
});
