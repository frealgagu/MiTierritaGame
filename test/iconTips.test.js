import test from 'node:test';
import assert from 'node:assert/strict';
import { iconName } from '../src/ui/iconTips.js';
import { PRODUCTS } from '../src/data/products.js';

test('nombres de íconos: cada producto se reconoce por su ícono', () => {
  for (const p of Object.values(PRODUCTS)) assert.ok(iconName(p.icon)?.includes(p.name), `${p.name} (${p.icon})`);
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
