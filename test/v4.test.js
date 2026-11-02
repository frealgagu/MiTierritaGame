import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/Game.js';
import { createInitialState } from '../src/sim/state.js';
import { chainOf, BY_CHILDREN, CHILDREN, JOIN_FROM } from '../src/sim/chain.js';
import { CALENDAR } from '../src/sim/calendar.js';
import { analyzeChain } from '../src/sim/analysis.js';
import { loadGame } from '../src/core/SaveSystem.js';
import { objectiveUpgrades, createEventState } from '../src/sim/events.js';
import { EVENTS_BY_ID } from '../src/data/events.js';

// Las dos mecánicas de la v4.0: la estación con dos productos (el subproducto sigue su camino por la
// canaleta: a otra estación, a una que lo junta o a una ruta) y la estación que junta dos de su zona.

// Una región con estas zonas construidas a un nivel parejo, sin calendario, corrida `secs` segundos.
function run(region, zones, level, secs, routes = []) {
  const game = new Game(createInitialState(0, region));
  for (const z of zones.slice(1)) game.unlockZone(z);
  game.state.coins = 1e18;
  for (const z of zones) {
    for (const id of chainOf(z).slice(1)) game.unlock(id);
    for (const id of chainOf(z)) game.state.stations[id].level = game.state.stations[id].transport.level = level;
    game.state.zones[z].dispatch.level = level;
  }
  for (const r of routes) game.state.routes[r].level = level;
  const on = CALENDAR.on;
  CALENDAR.on = false;
  for (let t = 0; t < secs; t += 0.1) game.step(0.1);
  CALENDAR.on = on;
  return game;
}

test('la cadena sabe quién junta qué y de dónde le llega', () => {
  assert.deepEqual(JOIN_FROM.almojabana_oven, { paipa_curd: 'paipa_curdler' });
  assert.ok(CHILDREN.paipa_curdler.includes('almojabana_oven'), 'las mulas de la Cuajadera llevan cuajada al Horno');
  assert.deepEqual(JOIN_FROM.bandeja_kitchen, { suero_costeno: 'curdler' });
  assert.ok(BY_CHILDREN.curdler.includes('bandeja_kitchen'), 'el suero llega a la Cocina por la canaleta');
  assert.ok(!CHILDREN.curdler.includes('bandeja_kitchen'));
  assert.deepEqual(BY_CHILDREN.wetmill, ['composter']);
});

test('Paipa: el Horno de almojábanas junta la cuajada de la Cuajadera con el queso Paipa', () => {
  const game = run('boyaca', ['papal', 'cerveceria', 'raquira', 'paipa'], 20, 600, ['papitas', 'barro', 'bagazo']);
  const s = game.state;
  assert.ok(s.stats.produced.almojabana > 400, `almojábanas: ${s.stats.produced.almojabana}`);
  // La mitad de la cuajada va a los Moldes y la otra mitad al Horno.
  assert.ok(Math.abs(s.stats.produced.queso_paipa / s.stats.produced.paipa_curd - 0.5) < 0.05);
  const row = analyzeChain(s, 'paipa').rows.find((r) => r.id === 'almojabana_oven');
  assert.ok(row.joined.paipa_curd > 0 && !row.joinLimited);
});

test('Paipa: sin cuajada, el Horno espera y lo dice', () => {
  const game = run('boyaca', ['papal', 'cerveceria', 'raquira', 'paipa'], 20, 5, ['papitas', 'barro', 'bagazo']);
  const st = game.state.stations.almojabana_oven;
  st.joined = {};
  st.input = 100;
  game.state.stations.paipa_curdler.level = 1; // casi no llega cuajada
  game.state.stations.paipa_curdler.buffer = 0;
  game.state.mules = game.state.mules.filter((m) => m.to !== 'almojabana_oven');
  for (let t = 0; t < 1; t += 0.1) game.step(0.1);
  assert.equal(st.status, 'starved');
  assert.equal(st.lacking, 'paipa_curd');
  const a = analyzeChain(game.state, 'paipa');
  assert.equal(a.rows.find((r) => r.id === 'almojabana_oven').joinLimited, 'paipa_curd');
});

test('La Quesera: el suero de la Cuajadera pasa por la canaleta a la Cocina de la bandeja', () => {
  const game = run('costa', ['arrozal', 'cocal', 'cienaga', 'quesera'], 20, 900, ['arroz', 'pescado']);
  const s = game.state;
  assert.ok((s.stats.produced.bandeja_costena ?? 0) > 0, 'hace bandejas');
  assert.ok((s.stations.bandeja_kitchen.joined.suero_costeno ?? 0) > 0, 'le llega suero');
  assert.notEqual(s.stations.bandeja_kitchen.lacking, 'suero_costeno');
});

test('La Finca: la pulpa sigue llegando a la Compostera como antes', () => {
  const game = new Game();
  game.state.coins = 1e12;
  for (const id of chainOf('finca').slice(1)) game.unlock(id);
  game.unlock('composter');
  const on = CALENDAR.on;
  CALENDAR.on = false;
  for (let t = 0; t < 300; t += 0.1) game.step(0.1);
  CALENDAR.on = on;
  assert.ok((game.state.stats.produced.compost ?? 0) > 0);
});

test('un subproducto con ruta se guarda en la bodega para ella; si la ruta aún no abre, se vende', () => {
  // Los cueros del Desposte: con la Talabartería abierta los lleva la Ruta de los cueros...
  const open = run('llanos', ['palma', 'frutal', 'cachamera', 'hato_llanero', 'talabarteria'], 20, 600, ['aceite', 'cachamas', 'cueros']);
  assert.ok((open.state.stats.imported.fresh_hide ?? 0) > 0, 'llegan cueros a la Talabartería');
  assert.ok(!(open.state.stats.sold.fresh_hide > 0), 'no se venden en el Hato');
  // ...y con la Talabartería cerrada se venden en el Hato.
  const closed = run('llanos', ['palma', 'frutal', 'cachamera', 'hato_llanero'], 20, 600, ['aceite', 'cachamas']);
  assert.ok((closed.state.stats.sold.fresh_hide ?? 0) > 0, 'se venden los cueros');
  const row = analyzeChain(closed.state, 'hato_llanero').rows.find((r) => r.id === 'llanero_butcher');
  assert.ok(row.bySold > 0 && !row.byLost);
});

test('en un evento, lo que lleva al reto incluye la estación que le hace a la otra lo que junta', () => {
  const board = createEventState(EVENTS_BY_ID.obras, 1);
  const ids = objectiveUpgrades(board);
  for (const id of ['almojabana_oven', 'cheese_cave', 'paipa_curdler', 'paipa_herd']) assert.ok(ids.includes(id), id);
});

test('una partida de antes: las rutas nuevas arrancan al nivel de la estación que abastecen', () => {
  const old = createInitialState(0, 'llanos');
  delete old.routes.palmiste;
  delete old.routes.cueros;
  old.stations.hotel_campestre = { level: 37, transport: { level: 37 } };
  old.stations.hide_yard = { level: 52, transport: { level: 50 } };
  const root = createInitialState(0, 'cafetero');
  root.regions = { llanos: old };
  const store = { 'mitierrita.save': JSON.stringify(root) };
  globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => (store[k] = v), removeItem: (k) => delete store[k] };
  const s = loadGame();
  delete globalThis.localStorage;
  assert.equal(s.regions.llanos.routes.palmiste.level, 37);
  assert.equal(s.regions.llanos.routes.cueros.level, 52);
  assert.equal(s.regions.llanos.routes.aceite.level, 1, 'las de antes no cambian');
});
