import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/Game.js';
import { createInitialState, linkRegion } from '../src/sim/state.js';
import { newGame } from './helpers/game.js';
import { openRegions, regionState } from '../src/sim/regions.js';
import { ROUTES } from '../src/data/routes.js';
import { routeActive, routeRegion } from '../src/sim/routes.js';
import { routeFlow } from '../src/sim/analysis.js';
import { ZONES_BY_ID } from '../src/data/zones/index.js';

// Bogotá (v4.5): the region with no native source, where everything arrives by tractomula with endless cargo. Since v4.6,
// a station network instead of neighborhoods.

test('the Bogotá game has its trucks, and no other region has them', () => {
  const s = createInitialState(0, 'bogota');
  const tractomulas = ROUTES.filter((r) => r.unlimited).map((r) => r.id);
  assert.ok(tractomulas.length >= 7);
  for (const id of tractomulas) assert.ok(s.routes[id], `${id} missing in Bogotá`);
  assert.deepEqual(Object.keys(s.routes).sort(), [...tractomulas].sort());
  for (const r of ROUTES.filter((x) => x.unlimited)) assert.equal(routeRegion(r), 'bogota');
  assert.ok(!createInitialState(0, 'cundinamarca').routes.tm_cafe);
});

test('the truck brings cargo without a source warehouse and the Tostadero produces', () => {
  const s = createInitialState(0, 'bogota');
  assert.ok(s.stations.tostadero_chorro, 'the Tostadero comes built');
  assert.ok(routeActive(s, 'tm_cafe'));
  const game = new Game(s);
  for (let i = 0; i < 1200; i++) game.step(0.1); // 2 minutos
  assert.ok(s.stats.imported.coffee_bag > 0, 'coffee arrived');
  assert.ok(s.stats.produced.cafe_capitalino > 0, 'coffee was roasted');
  assert.ok(s.coins > 0, 'something was sold');
  // Route doesn't depend on any warehouse: moves what the station requests (up to carry capacity).
  assert.ok(routeFlow(s, 'tm_cafe') > 0);
});

test('Bogotá opens upon completing Zipaquirá, published and without construction (v4.5)', async () => {
  const { REGIONS_BY_ID } = await import('../src/data/regions.js');
  assert.ok(!REGIONS_BY_ID.bogota.hidden && !REGIONS_BY_ID.bogota.wip);
  const root = newGame(0);
  root.regions.cundinamarca = createInitialState(0, 'cundinamarca');
  linkRegion(root, 'cundinamarca');
  assert.deepEqual(openRegions(root), []);
  root.regions.cundinamarca.zones.zipaquira.complete = true;
  assert.ok(openRegions(root).includes('bogota'));
  assert.ok(regionState(root, 'bogota').zones.bogota.unlocked);
});

test('networked (v4.6): at the start several can be built at once, cheaply, each one once the ones that supply it are there', async () => {
  const { buildableStations, suppliersOf } = await import('../src/sim/chain.js');
  const { quoteUnlock } = await import('../src/sim/upgrades.js');
  const { STATIONS_BY_ID } = await import('../src/data/stations.js');
  const s = createInitialState(0, 'bogota');
  const start = buildableStations(s, 'bogota');
  assert.deepEqual(start, ['despensa_zona_g', 'toldo_tejidos', 'puesto_flores', 'puesto_frutas', 'cafeteria_septima']);
  for (const id of start) assert.ok(STATIONS_BY_ID[id].unlockCost <= 12000, id);
  s.coins = 1e9;
  // Fritanga combines goods from three stations: requests all three (plus its input's).
  assert.deepEqual(suppliersOf('fritanga_plaza').sort(), ['cocina_entradas', 'despensa_zona_g', 'pescaderia_plaza']);
  const q = quoteUnlock(s, 'fritanga_plaza');
  assert.equal(q.reason, 'order');
  const game = new Game(s);
  for (const id of ['despensa_zona_g', 'puesto_frutas', 'cocina_entradas', 'pescaderia_plaza']) assert.ok(game.unlock(id), id);
  assert.ok(buildableStations(s, 'bogota').includes('fritanga_plaza'));
  // Downtown goods are the most expensive.
  assert.ok(STATIONS_BY_ID.gran_feria.unlockCost >= 1e9);
});

test(`the Fritanga joins what three stations make (with the Cocina's chicharrón, without mules) and works`, () => {
  const s = createInitialState(0, 'bogota');
  s.coins = 1e9;
  const game = new Game(s);
  for (const id of ['despensa_zona_g', 'puesto_frutas', 'cocina_entradas', 'pescaderia_plaza', 'fritanga_plaza']) assert.ok(game.unlock(id), id);
  for (let i = 0; i < 6000; i++) game.step(0.1); // 10 minutos
  assert.ok(s.stats.produced.chicharron > 0, 'the Cocina made chicharrón');
  assert.ok(s.stats.produced.desayuno_plaza > 0, 'some breakfast came out');
  for (const p of ['alino_box', 'criollas_box', 'juice_box', 'trucha_ahumada', 'lechona']) assert.ok(s.stats.imported[p] > 0, `${p} arrived`);
});

test('with the whole network built, the Gran Feria joins what three downtown stations make', () => {
  const s = createInitialState(0, 'bogota');
  s.coins = 1e13;
  const game = new Game(s);
  const { chain } = ZONES_BY_ID.bogota;
  for (const id of chain) if (!s.stations[id]) assert.ok(game.unlock(id), id);
  for (const id of Object.keys(s.stations)) s.stations[id].level = s.stations[id].transport.level = 50;
  for (const r of Object.values(s.routes)) r.level = 50;
  for (let i = 0; i < 30000; i++) game.step(0.1); // 50 minutos
  assert.ok(s.stats.produced.subida_monserrate > 0, 'someone went up Monserrate');
  assert.ok(s.stats.produced.caldo_costilla > 0 && s.stats.produced.cafe_molido > 0, 'the by-products came out');
  assert.ok(s.stats.produced.feria_mi_tierrita > 0, 'there was a Gran Feria');
});
