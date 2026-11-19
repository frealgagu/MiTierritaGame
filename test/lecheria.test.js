import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/Game.js';
import { analyzeChain, recommendUpgrade, routeFlow } from '../src/sim/analysis.js';
import { CHILDREN, chainOf } from '../src/sim/chain.js';
import { routeCapacity, routeReserve } from '../src/sim/routes.js';

function run(game, seconds) {
  for (let t = 0; t < seconds; t += 0.1) game.step(0.1);
}

// Save with full Trapiche (Pulverizadora built) and Lechería open.
function withLecheria(level = 20) {
  const game = new Game();
  const s = game.state;
  s.coins = 1e12;
  game.unlockZone('trapiche');
  for (const id of chainOf('trapiche').slice(1)) game.unlock(id);
  game.unlockZone('lecheria');
  for (const id of Object.keys(s.stations)) {
    s.stations[id].level = level;
    s.stations[id].transport.level = level;
  }
  for (const z of Object.values(s.zones)) z.dispatch.level = 40;
  return game;
}

function buildLecheria(game, ids = chainOf('lecheria').slice(1), level = 20) {
  for (const id of ids) {
    assert.ok(game.unlock(id), id);
    game.state.stations[id].level = level;
    game.state.stations[id].transport.level = level;
  }
  game.state.routes.panela.level = level;
}

test('pasteurized milk is split among three branches', () => {
  assert.deepEqual(CHILDREN.pasteurizer, ['cheesery', 'separator', 'arequipe_pot']);
  assert.deepEqual(CHILDREN.separator, ['churn']);
});

test('at the same level, the Pasteurizadora splits its milk: a quarter for each branch and another for the Cacaotal', () => {
  const game = withLecheria();
  buildLecheria(game);
  const a = analyzeChain(game.state, 'lecheria');
  const row = (id) => a.rows.find((r) => r.id === id);
  const milk = row('pasteurizer').output;
  for (const id of ['cheesery', 'separator', 'arequipe_pot']) {
    assert.ok(Math.abs(row(id).capacity - milk / 4) < 1e-9, `${id} processes ${row(id).capacity} of ${milk}`);
  }
  // Without Cacaotal, the quarter reserved for the route is sold as milk.
  assert.ok(Math.abs(row('pasteurizer').diverted - milk / 4) < 1e-9, 'a quarter is left over');
  // In the simulation, mules carry milk to all three.
  run(game, 300);
  for (const p of ['cheese', 'cream', 'arequipe']) assert.ok((game.state.stats.produced[p] ?? 0) > 0, `it made ${p}`);
});

test('with a single branch built, the leftover milk is sold unprocessed', () => {
  const game = withLecheria();
  buildLecheria(game, ['pasteurizer', 'cheesery']);
  const a = analyzeChain(game.state, 'lecheria');
  const past = a.rows.find((r) => r.id === 'pasteurizer');
  assert.ok(past.diverted > 0, 'diverts milk to the warehouse');
  run(game, 120);
  assert.ok((game.state.stats.sold.milk ?? 0) > 0, 'it sold pasteurized milk');
});

test(`the Paila does not work without the Trapiche's panela`, () => {
  const game = withLecheria();
  buildLecheria(game);
  // No panela in Trapiche's warehouse or Paila.
  game.state.stations.pulverizer.level = 1;
  game.state.stations.molds.level = 1;
  game.state.stations.arequipe_pot.input = 100;
  game.state.stations.arequipe_pot.imported = {};
  game.state.zones.trapiche.warehouse = {};
  game.state.stations.pulverizer.buffer = 0;
  game.state.stations.pulverizer.input = 0;
  game.state.stations.molds.buffer = 0;
  game.state.stations.molds.input = 0;
  game.step(0.1);
  assert.equal(game.state.stations.arequipe_pot.missing, 'panela_powder');
  assert.equal(game.state.stations.arequipe_pot.status, 'starved');
});

test(`the Chiva takes the panela from the Trapiche's warehouse to the Paila`, () => {
  const game = withLecheria();
  buildLecheria(game);
  const s = game.state;
  s.zones.trapiche.warehouse = { panela_powder: 100 };
  const events = [];
  game.bus.on('routeDeparted', (e) => events.push(['salió', e.load]));
  game.bus.on('routeArrived', (e) => events.push(['llegó', e.load]));
  run(game, 0.2);
  assert.equal(s.routes.panela.phase, 'go');
  const load = s.routes.panela.load;
  assert.ok(load > 0 && load <= routeCapacity(s, 'panela') + 1e-9, `load ${load}`);
  run(game, 31);
  assert.ok(s.stats.imported.panela_powder >= load - 1e-9, 'it reached the Lechería');
  assert.deepEqual(events.map((e) => e[0]).slice(0, 2), ['salió', 'llegó']);
  run(game, 120);
  assert.ok((s.stats.produced.arequipe ?? 0) > 0, 'it made arequipe');
});

test(`the Trapiche's Willys does not sell the panela the Chiva is waiting for`, () => {
  const game = withLecheria();
  buildLecheria(game);
  const s = game.state;
  // Little panela: Chiva waits to fill up (up to 10 s) while Willys leaves earlier with the rest.
  s.stations.arequipe_pot.imported = {};
  s.zones.trapiche.warehouse = { panela_powder: 3, cane: 50 };
  const sold = s.stats.sold.panela_powder ?? 0;
  assert.ok(routeReserve(s, 'trapiche').panela_powder > 0, 'reserved for the Chiva');
  run(game, 9);
  assert.equal(s.routes.panela.phase, 'idle', 'the Chiva is still waiting');
  assert.ok((s.stats.sold.cane ?? 0) > 0, 'the Willys sold the cane');
  assert.equal(s.stats.sold.panela_powder ?? 0, sold, 'but not the panela');
});

test('panela that leaves by the route is not counted twice in income', () => {
  const game = withLecheria();
  buildLecheria(game);
  const s = game.state;
  const flow = routeFlow(s, 'panela');
  assert.ok(flow > 0);
  const withRoute = analyzeChain(s, 'trapiche').income;
  const without = analyzeChain(s, 'trapiche', { exports: false }).income;
  assert.ok(Math.abs(without - withRoute - flow * 250) < 1e-6, `${without} - ${withRoute} ≠ ${flow * 250}`);
});

test('the route can only be upgraded when the Paila exists', () => {
  const game = withLecheria();
  assert.equal(game.quote('route:panela', 1).affordable, false);
  assert.equal(game.buy('route:panela', 1), false);
  buildLecheria(game);
  assert.ok(game.buy('route:panela', 1));
});

test('if the Paila is waiting for panela, the recommendation can point to the Trapiche', () => {
  const game = withLecheria(30);
  buildLecheria(game, undefined, 30);
  const s = game.state;
  // Trapiche's Pulverizadora lags far behind: not enough for Paila.
  s.stations.pulverizer.level = 5;
  s.stations.pulverizer.transport.level = 5;
  const a = analyzeChain(s, 'lecheria');
  assert.ok(a.rows.find((r) => r.id === 'arequipe_pot').importLimited, 'the Paila is waiting for panela');
  const rec = recommendUpgrade(s, (id, mode) => game.quote(id, mode), 'lecheria');
  assert.ok(rec.id.startsWith('pulverizer') || rec.id.startsWith('molds'), `it recommended ${rec.id}`);
});

test('a v1.1 save with the Trapiche complete opens the Lechería and the route', async () => {
  const { loadGame } = await import('../src/core/SaveSystem.js');
  const old = new Game().state;
  old.version = 5;
  old.zones.trapiche = { ...old.zones.trapiche, unlocked: true, complete: true };
  delete old.zones.lecheria;
  delete old.routes;
  delete old.stats.imported;
  const store = { 'mitierrita.save': JSON.stringify(old) };
  globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => (store[k] = v), removeItem: (k) => delete store[k] };
  const s = loadGame().regions.cafetero;
  delete globalThis.localStorage;
  assert.equal(s.zones.lecheria.unlocked, true);
  assert.ok(s.stations.pasture, 'the Potrero produces');
  assert.equal(s.routes.panela.level, 1);
  assert.deepEqual(s.stats.imported, {});
});
