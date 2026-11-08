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

test('Bogotá, mientras está oculta, no se abre al completar Zipaquirá (v4.4.8)', async () => {
  const { REGIONS_BY_ID } = await import('../src/data/regions.js');
  assert.ok(REGIONS_BY_ID.bogota.hidden);
  const root = createInitialState(0);
  root.regions = { cundinamarca: createInitialState(0, 'cundinamarca') };
  root.regions.cundinamarca.zones.zipaquira.complete = true;
  assert.ok(!openRegions(root).includes('bogota'));
});

test('Bogotá se abre al completar Zipaquirá', async () => {
  const { REGIONS_BY_ID } = await import('../src/data/regions.js');
  const hidden = REGIONS_BY_ID.bogota.hidden;
  REGIONS_BY_ID.bogota.hidden = false; // como quedará al publicarla
  const root = createInitialState(0);
  root.regions = { cundinamarca: createInitialState(0, 'cundinamarca') };
  assert.deepEqual(openRegions(root), []);
  root.regions.cundinamarca.zones.zipaquira.complete = true;
  assert.ok(openRegions(root).includes('bogota'));
  assert.ok(regionState(root, 'bogota').zones.bogota.unlocked);
  REGIONS_BY_ID.bogota.hidden = hidden;
});

test('los barrios se construyen a la vez, cada uno en su orden', async () => {
  const { buildableStations } = await import('../src/sim/chain.js');
  const { quoteUnlock } = await import('../src/sim/upgrades.js');
  const s = createInitialState(0, 'bogota');
  // Al empezar: la siguiente de La Candelaria y la primera de la Zona G.
  assert.deepEqual(buildableStations(s, 'bogota'), ['cafeteria_septima', 'despensa_zona_g', 'toldo_tejidos', 'puesto_flores']);
  s.coins = 1e9;
  assert.equal(quoteUnlock(s, 'despensa_zona_g').ok, true);
  const q = quoteUnlock(s, 'cocina_entradas');
  assert.equal(q.reason, 'order');
  assert.equal(q.previous, 'despensa_zona_g');
  // Construida la Despensa, la Zona G sigue sin esperar a La Candelaria.
  const game = new Game(s);
  assert.ok(game.unlock('despensa_zona_g'));
  assert.deepEqual(buildableStations(s, 'bogota'), ['cafeteria_septima', 'cocina_entradas', 'toldo_tejidos', 'puesto_flores']);
});

test('la Zona G trabaja con sus tractomulas, aunque La Candelaria no esté', () => {
  const s = createInitialState(0, 'bogota');
  s.coins = 1e9;
  const game = new Game(s);
  for (const id of ['despensa_zona_g', 'cocina_entradas', 'parrilla_zona_g', 'reposteria_zona_g', 'restaurante_zona_g']) assert.ok(game.unlock(id), id);
  for (let i = 0; i < 6000; i++) game.step(0.1); // 10 minutos
  assert.ok(s.stats.produced.cena_zona_g > 0, 'salió alguna cena');
  for (const p of ['alino_box', 'aji_box', 'criollas_box', 'ant_cone', 'parranda_llanera', 'rice_sack', 'asai_box', 'juice_box']) assert.ok(s.stats.imported[p] > 0, `llegó ${p}`);
});

test('el centro se abre con los cuatro barrios construidos, y la Gran Feria junta todo', async () => {
  const { buildableStations, groupsOf } = await import('../src/sim/chain.js');
  const s = createInitialState(0, 'bogota');
  s.coins = 1e13;
  const game = new Game(s);
  const barrios = groupsOf('bogota').filter((g) => g.id !== 'centro');
  for (const g of barrios) for (const id of g.stations) if (!s.stations[id]) assert.ok(game.unlock(id), id);
  assert.deepEqual(buildableStations(s, 'bogota'), ['hotel_capital']);
  for (const id of ['hotel_capital', 'funicular_monserrate', 'pabellon_regiones', 'gran_feria']) assert.ok(game.unlock(id), id);
  for (const id of Object.keys(s.stations)) s.stations[id].level = s.stations[id].transport.level = 50;
  for (const r of Object.values(s.routes)) r.level = 50;
  for (let i = 0; i < 30000; i++) game.step(0.1); // 50 minutos
  assert.ok(s.stats.produced.subida_monserrate > 0, 'se subió a Monserrate');
  assert.ok(s.stats.produced.feria_mi_tierrita > 0, 'hubo Gran Feria');
});
