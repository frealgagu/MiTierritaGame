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

// Both v4.0 mechanics: station with two outputs (the byproduct continues along its
// chute: to another station, to a combiner station, or to a route) and station combining two in its zone.

// A region with these zones built to an even level, no calendar, run for `secs` seconds.
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

test('the chain knows who joins what and where it comes from', () => {
  assert.deepEqual(JOIN_FROM.almojabana_oven, { paipa_curd: 'paipa_curdler' });
  assert.ok(CHILDREN.paipa_curdler.includes('almojabana_oven'), `the Cuajadera's mules take curd to the Horno`);
  assert.deepEqual(JOIN_FROM.bandeja_kitchen, { suero_costeno: 'curdler' });
  assert.ok(BY_CHILDREN.curdler.includes('bandeja_kitchen'), 'the whey reaches the Cocina by the channel');
  assert.ok(!CHILDREN.curdler.includes('bandeja_kitchen'));
  assert.deepEqual(BY_CHILDREN.wetmill, ['composter']);
});

test(`Paipa: the almojábana Horno joins the Cuajadera's curd with Paipa cheese`, () => {
  const game = run('boyaca', ['papal', 'cerveceria', 'raquira', 'paipa'], 20, 600, ['papitas', 'barro', 'bagazo']);
  const s = game.state;
  assert.ok(s.stats.produced.almojabana > 400, `almojábanas: ${s.stats.produced.almojabana}`);
  // Half of the curds go to Moldes and the other half to Horno.
  assert.ok(Math.abs(s.stats.produced.queso_paipa / s.stats.produced.paipa_curd - 0.5) < 0.05);
  const row = analyzeChain(s, 'paipa').rows.find((r) => r.id === 'almojabana_oven');
  assert.ok(row.joined.paipa_curd > 0 && !row.joinLimited);
});

test('Paipa: without curd, the Horno waits and says so', () => {
  const game = run('boyaca', ['papal', 'cerveceria', 'raquira', 'paipa'], 20, 5, ['papitas', 'barro', 'bagazo']);
  const st = game.state.stations.almojabana_oven;
  st.joined = {};
  st.input = 100;
  game.state.stations.paipa_curdler.level = 1; // almost no curds arrive
  game.state.stations.paipa_curdler.buffer = 0;
  game.state.mules = game.state.mules.filter((m) => m.to !== 'almojabana_oven');
  for (let t = 0; t < 1; t += 0.1) game.step(0.1);
  assert.equal(st.status, 'starved');
  assert.equal(st.lacking, 'paipa_curd');
  const a = analyzeChain(game.state, 'paipa');
  assert.equal(a.rows.find((r) => r.id === 'almojabana_oven').joinLimited, 'paipa_curd');
});

test(`La Quesera: the Cuajadera's whey goes by the channel to the platter Cocina`, () => {
  const game = run('costa', ['arrozal', 'cocal', 'cienaga', 'quesera'], 20, 900, ['arroz', 'pescado']);
  const s = game.state;
  assert.ok((s.stats.produced.bandeja_costena ?? 0) > 0, 'it makes platters');
  assert.ok((s.stations.bandeja_kitchen.joined.suero_costeno ?? 0) > 0, 'whey reaches it');
  assert.notEqual(s.stations.bandeja_kitchen.lacking, 'suero_costeno');
});

test('La Finca: the pulp keeps reaching the Compostera as before', () => {
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

test('a by-product with a route is kept in the warehouse for it; if the route has not opened yet, it is sold', () => {
  // Hides from Desposte: with Talabartería open, the hides route carries them...
  const open = run('llanos', ['palma', 'frutal', 'cachamera', 'hato_llanero', 'talabarteria'], 20, 600, ['aceite', 'cachamas', 'cueros']);
  assert.ok((open.state.stats.imported.fresh_hide ?? 0) > 0, 'hides reach the Talabartería');
  assert.ok(!(open.state.stats.sold.fresh_hide > 0), 'they are not sold at the Hato');
  // ...and with Talabartería closed they are sold at the Hato.
  const closed = run('llanos', ['palma', 'frutal', 'cachamera', 'hato_llanero'], 20, 600, ['aceite', 'cachamas']);
  assert.ok((closed.state.stats.sold.fresh_hide ?? 0) > 0, 'the hides are sold');
  const row = analyzeChain(closed.state, 'hato_llanero').rows.find((r) => r.id === 'llanero_butcher');
  assert.ok(row.bySold > 0 && !row.byLost);
});

test('in an event, what leads to the challenge includes the station that makes for the other what it joins', () => {
  const board = createEventState(EVENTS_BY_ID.obras, 1);
  const ids = objectiveUpgrades(board);
  for (const id of ['almojabana_oven', 'cheese_cave', 'paipa_curdler', 'paipa_herd']) assert.ok(ids.includes(id), id);
});

test('an older save: new routes start at the level of the station they supply', () => {
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
  assert.equal(s.regions.llanos.routes.aceite.level, 1, 'the older ones do not change');
});

test('an older save: restarts stay at the cap (60) and without the log of each game', () => {
  const root = createInitialState(0, 'cafetero');
  root.legacy = { resets: 68, history: Array.from({ length: 68 }, (_, k) => ({ mult: 2 ** Math.min(k, 60), playTime: 100, totalEarned: 1 })) };
  const llanos = createInitialState(0, 'llanos');
  llanos.legacy = { resets: 3, history: [{ mult: 1 }, { mult: 2 }, { mult: 4 }] };
  root.regions = { llanos };
  const store = { 'mitierrita.save': JSON.stringify(root) };
  globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => (store[k] = v), removeItem: (k) => delete store[k] };
  const s = loadGame();
  delete globalThis.localStorage;
  assert.deepEqual(s.regions.cafetero.legacy, { resets: 60 });
  assert.deepEqual(s.regions.llanos.legacy, { resets: 3 });
});
