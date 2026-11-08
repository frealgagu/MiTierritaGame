import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/Game.js';
import { createInitialState } from '../src/sim/state.js';
import { openRegions, regionState } from '../src/sim/regions.js';
import { ROUTES } from '../src/data/routes.js';
import { routeActive, routeRegion } from '../src/sim/routes.js';
import { routeFlow } from '../src/sim/analysis.js';

// Bogotá (v4.5): la región sin fuente propia, donde todo llega en tractomula con carga que no se acaba.

test('la partida de Bogotá tiene sus tractomulas, y ninguna otra región las tiene', () => {
  const s = createInitialState(0, 'bogota');
  const tractomulas = ROUTES.filter((r) => r.unlimited).map((r) => r.id);
  assert.ok(tractomulas.length >= 7);
  for (const id of tractomulas) assert.ok(s.routes[id], `${id} falta en Bogotá`);
  assert.deepEqual(Object.keys(s.routes).sort(), [...tractomulas].sort());
  for (const r of ROUTES.filter((x) => x.unlimited)) assert.equal(routeRegion(r), 'bogota');
  assert.ok(!createInitialState(0, 'cundinamarca').routes.tm_cafe);
});

test('la tractomula trae carga sin bodega de origen y el Tostadero produce', () => {
  const s = createInitialState(0, 'bogota');
  assert.ok(s.stations.tostadero_chorro, 'el Tostadero viene construido');
  assert.ok(routeActive(s, 'tm_cafe'));
  const game = new Game(s);
  for (let i = 0; i < 1200; i++) game.step(0.1); // 2 minutos
  assert.ok(s.stats.imported.coffee_bag > 0, 'llegó café');
  assert.ok(s.stats.produced.cafe_capitalino > 0, 'se tostó café');
  assert.ok(s.coins > 0, 'se vendió algo');
  // La ruta no depende de ninguna bodega: lo que mueve es lo que pide la estación (hasta lo que lleva).
  assert.ok(routeFlow(s, 'tm_cafe') > 0);
});

test('Bogotá se abre al completar Zipaquirá', () => {
  const root = createInitialState(0);
  root.regions = { cundinamarca: createInitialState(0, 'cundinamarca') };
  assert.deepEqual(openRegions(root), []);
  root.regions.cundinamarca.zones.zipaquira.complete = true;
  assert.ok(openRegions(root).includes('bogota'));
  assert.ok(regionState(root, 'bogota').zones.bogota.unlocked);
});
