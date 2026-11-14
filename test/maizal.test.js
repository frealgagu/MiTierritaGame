import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/Game.js';
import { analyzeChain, recommendUpgrade, routeFlow } from '../src/sim/analysis.js';
import { chainOf } from '../src/sim/chain.js';
import { stationImportRate } from '../src/sim/routes.js';
import { ROUTES_BY_ID } from '../src/data/routes.js';

function run(game, seconds) {
  for (let t = 0; t < seconds; t += 0.1) game.step(0.1);
}

// Save with all five zones open and everything built at the same level.
function withMaizal(level = 30) {
  const game = new Game();
  const s = game.state;
  s.coins = 1e18;
  for (const z of ['trapiche', 'lecheria', 'cacaotal', 'maizal']) {
    game.unlockZone(z);
    for (const id of chainOf(z).slice(1)) assert.ok(game.unlock(id), id);
  }
  for (const id of chainOf('finca').slice(1)) game.unlock(id);
  for (const st of Object.values(s.stations)) {
    st.level = level;
    st.transport.level = level;
  }
  for (const z of Object.values(s.zones)) z.dispatch.level = Math.max(40, level);
  for (const r of Object.values(s.routes)) r.level = level;
  return game;
}

test(`at the same level, the Lechería's cheese and butter are just enough for the Puesto de arepas`, () => {
  const game = withMaizal();
  const s = game.state;
  for (const id of ['queso', 'mantequilla']) {
    const need = stationImportRate(s, ROUTES_BY_ID[id], 'arepa_stand');
    assert.ok(Math.abs(routeFlow(s, id) - need) < 1e-9, `${id}: ${routeFlow(s, id)} of ${need}`);
  }
  const stand = analyzeChain(s, 'maizal').rows.find((r) => r.id === 'arepa_stand');
  assert.equal(stand.importLimited, null);
  // The arepas Budare makes are what Puesto consumes.
  const budare = analyzeChain(s, 'maizal').rows.find((r) => r.id === 'budare');
  assert.ok(Math.abs(stand.capacity - budare.output) < 1e-9);
});

test('if the Puesto de arepas, its mule drivers and the two routes hold each other back, the furthest behind is recommended', () => {
  const game = withMaizal(40);
  const s = game.state;
  // How a casual test playthrough ended up: nothing standalone (nor in pairs) paid off and Piladora was recommended.
  s.stations.arepa_stand.level = 4;
  s.stations.arepa_stand.transport.level = 1;
  s.routes.queso.level = 2;
  s.routes.mantequilla.level = 2;
  const rec = recommendUpgrade(s, (id, mode) => game.quote(id, mode), 'maizal');
  assert.equal(rec.id, 'arepa_stand:transport');
  assert.ok(rec.gain > 0);
});

test('the Puesto de arepas makes cheese arepas with what the Chiva brings', () => {
  const game = withMaizal();
  run(game, 600);
  assert.ok((game.state.stats.imported.cheese ?? 0) > 0, 'cheese arrived');
  assert.ok((game.state.stats.imported.butter ?? 0) > 0, 'butter arrived');
  assert.ok((game.state.stats.sold.cheese_arepa ?? 0) > 0, 'it sold cheese arepas');
});

test('at level 100 in the five zones, with all the research, no yard fills up', async () => {
  const { RESEARCH } = await import('../src/data/research.js');
  const game = withMaizal(100);
  const s = game.state;
  for (const r of RESEARCH) s.research.push(r.id);
  run(game, 400);
  const blocked = {};
  for (let i = 0; i < 1000; i++) {
    game.step(0.1);
    for (const [id, st] of Object.entries(s.stations)) if (st.status === 'blocked') blocked[id] = (blocked[id] ?? 0) + 1;
  }
  assert.deepEqual(blocked, {});
});

test('a v1.3 save with the Cacaotal complete opens the Maizal', async () => {
  const { loadGame } = await import('../src/core/SaveSystem.js');
  const old = new Game().state;
  old.version = 7;
  for (const z of ['trapiche', 'lecheria', 'cacaotal']) old.zones[z] = { ...old.zones[z], unlocked: true, complete: true };
  delete old.zones.maizal;
  delete old.routes.queso;
  delete old.routes.mantequilla;
  const store = { 'mitierrita.save': JSON.stringify(old) };
  globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => (store[k] = v), removeItem: (k) => delete store[k] };
  const s = loadGame();
  delete globalThis.localStorage;
  assert.equal(s.zones.maizal.unlocked, true);
  assert.ok(s.stations.cornfield);
  assert.equal(s.routes.queso.level, 1);
});

test('what a route is waiting for goes on the platform: it does not fill the warehouse or stop the zone', async () => {
  const { warehouseCap, warehouseSpace } = await import('../src/sim/transport.js');
  const { routeReserve } = await import('../src/sim/routes.js');
  const game = withMaizal();
  const s = game.state;
  // Milk route at a high level: a load and a half of milk exceeds warehouse capacity.
  s.routes.leche.level = 80;
  s.zones.lecheria.dispatch.level = 5;
  const milk = routeReserve(s, 'lecheria').milk;
  assert.ok(milk > warehouseCap(s, 'lecheria'), 'the reserve would not fit in the warehouse');
  s.zones.lecheria.warehouse = { milk };
  s.mules = [];
  assert.equal(warehouseSpace(s, 'lecheria'), warehouseCap(s, 'lecheria'));
  // And Quesera keeps sending cheese to the warehouse for the cheese route.
  run(game, 300);
  assert.ok((s.stats.imported.cheese ?? 0) > 0, 'cheese reached the Maizal');
});
