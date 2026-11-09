import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/Game.js';
import { createInitialState } from '../src/sim/state.js';
import { openRegions, regionState } from '../src/sim/regions.js';
import { ROUTES } from '../src/data/routes.js';
import { routeActive, routeRegion } from '../src/sim/routes.js';
import { routeFlow } from '../src/sim/analysis.js';
import { ZONES_BY_ID } from '../src/data/zones/index.js';

// Bogotá (v4.5): la región sin fuente propia, donde todo llega en tractomula con carga que no se acaba. Desde la v4.6,
// una red de estaciones en vez de barrios.

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

test('Bogotá se abre al completar Zipaquirá, publicada y sin obra (v4.5)', async () => {
  const { REGIONS_BY_ID } = await import('../src/data/regions.js');
  assert.ok(!REGIONS_BY_ID.bogota.hidden && !REGIONS_BY_ID.bogota.wip);
  const root = createInitialState(0);
  root.regions = { cundinamarca: createInitialState(0, 'cundinamarca') };
  assert.deepEqual(openRegions(root), []);
  root.regions.cundinamarca.zones.zipaquira.complete = true;
  assert.ok(openRegions(root).includes('bogota'));
  assert.ok(regionState(root, 'bogota').zones.bogota.unlocked);
});

test('en red (v4.6): al empezar se pueden construir varias a la vez, baratas, y cada una cuando ya están las que la abastecen', async () => {
  const { buildableStations, suppliersOf } = await import('../src/sim/chain.js');
  const { quoteUnlock } = await import('../src/sim/upgrades.js');
  const { STATIONS_BY_ID } = await import('../src/data/stations.js');
  const s = createInitialState(0, 'bogota');
  const start = buildableStations(s, 'bogota');
  assert.deepEqual(start, ['despensa_zona_g', 'toldo_tejidos', 'puesto_flores', 'puesto_frutas', 'cafeteria_septima']);
  for (const id of start) assert.ok(STATIONS_BY_ID[id].unlockCost <= 12000, id);
  s.coins = 1e9;
  // La Fritanga junta lo de tres estaciones: pide las tres (y la de su entrada).
  assert.deepEqual(suppliersOf('fritanga_plaza').sort(), ['cocina_entradas', 'despensa_zona_g', 'pescaderia_plaza']);
  const q = quoteUnlock(s, 'fritanga_plaza');
  assert.equal(q.reason, 'order');
  const game = new Game(s);
  for (const id of ['despensa_zona_g', 'puesto_frutas', 'cocina_entradas', 'pescaderia_plaza']) assert.ok(game.unlock(id), id);
  assert.ok(buildableStations(s, 'bogota').includes('fritanga_plaza'));
  // Lo del centro es lo más caro.
  assert.ok(STATIONS_BY_ID.gran_feria.unlockCost >= 1e9);
});

test('la Fritanga junta lo de tres estaciones (con el chicharrón de la Cocina, sin mulas) y trabaja', () => {
  const s = createInitialState(0, 'bogota');
  s.coins = 1e9;
  const game = new Game(s);
  for (const id of ['despensa_zona_g', 'puesto_frutas', 'cocina_entradas', 'pescaderia_plaza', 'fritanga_plaza']) assert.ok(game.unlock(id), id);
  for (let i = 0; i < 6000; i++) game.step(0.1); // 10 minutos
  assert.ok(s.stats.produced.chicharron > 0, 'la Cocina sacó chicharrón');
  assert.ok(s.stats.produced.desayuno_plaza > 0, 'salió algún desayuno');
  for (const p of ['alino_box', 'criollas_box', 'juice_box', 'trucha_ahumada', 'lechona']) assert.ok(s.stats.imported[p] > 0, `llegó ${p}`);
});

test('con toda la red construida, la Gran Feria junta lo de tres estaciones del centro', () => {
  const s = createInitialState(0, 'bogota');
  s.coins = 1e13;
  const game = new Game(s);
  const { chain } = ZONES_BY_ID.bogota;
  for (const id of chain) if (!s.stations[id]) assert.ok(game.unlock(id), id);
  for (const id of Object.keys(s.stations)) s.stations[id].level = s.stations[id].transport.level = 50;
  for (const r of Object.values(s.routes)) r.level = 50;
  for (let i = 0; i < 30000; i++) game.step(0.1); // 50 minutos
  assert.ok(s.stats.produced.subida_monserrate > 0, 'se subió a Monserrate');
  assert.ok(s.stats.produced.caldo_costilla > 0 && s.stats.produced.cafe_molido > 0, 'salieron los subproductos');
  assert.ok(s.stats.produced.feria_mi_tierrita > 0, 'hubo Gran Feria');
});
