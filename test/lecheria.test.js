import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/Game.js';
import { analyzeChain, recommendUpgrade, routeFlow } from '../src/sim/analysis.js';
import { CHILDREN, chainOf } from '../src/sim/chain.js';
import { routeCapacity, routeReserve } from '../src/sim/routes.js';

function run(game, seconds) {
  for (let t = 0; t < seconds; t += 0.1) game.step(0.1);
}

// Partida con el Trapiche completo (Pulverizadora construida) y la Lechería abierta.
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

test('la leche pasteurizada se reparte entre tres ramas', () => {
  assert.deepEqual(CHILDREN.pasteurizer, ['cheesery', 'separator', 'arequipe_pot']);
  assert.deepEqual(CHILDREN.separator, ['churn']);
});

test('a igual nivel, la Pasteurizadora reparte su leche: un cuarto para cada rama y otro para el Cacaotal', () => {
  const game = withLecheria();
  buildLecheria(game);
  const a = analyzeChain(game.state, 'lecheria');
  const row = (id) => a.rows.find((r) => r.id === id);
  const milk = row('pasteurizer').output;
  for (const id of ['cheesery', 'separator', 'arequipe_pot']) {
    assert.ok(Math.abs(row(id).capacity - milk / 4) < 1e-9, `${id} procesa ${row(id).capacity} de ${milk}`);
  }
  // Sin el Cacaotal, el cuarto que sería para la ruta se vende como leche.
  assert.ok(Math.abs(row('pasteurizer').diverted - milk / 4) < 1e-9, 'sobra un cuarto');
  // En la simulación, las mulas llevan leche a las tres.
  run(game, 300);
  for (const p of ['cheese', 'cream', 'arequipe']) assert.ok((game.state.stats.produced[p] ?? 0) > 0, `produjo ${p}`);
});

test('con una sola rama construida, la leche que sobra se vende sin procesar', () => {
  const game = withLecheria();
  buildLecheria(game, ['pasteurizer', 'cheesery']);
  const a = analyzeChain(game.state, 'lecheria');
  const past = a.rows.find((r) => r.id === 'pasteurizer');
  assert.ok(past.diverted > 0, 'desvía leche a la bodega');
  run(game, 120);
  assert.ok((game.state.stats.sold.milk ?? 0) > 0, 'vendió leche pasteurizada');
});

test('la Paila no trabaja sin la panela del Trapiche', () => {
  const game = withLecheria();
  buildLecheria(game);
  // Sin panela en la bodega del Trapiche ni en la Paila.
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

test('la Chiva lleva la panela de la bodega del Trapiche a la Paila', () => {
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
  assert.ok(load > 0 && load <= routeCapacity(s, 'panela') + 1e-9, `carga ${load}`);
  run(game, 31);
  assert.ok(s.stats.imported.panela_powder >= load - 1e-9, 'llegó a la Lechería');
  assert.deepEqual(events.map((e) => e[0]).slice(0, 2), ['salió', 'llegó']);
  run(game, 120);
  assert.ok((s.stats.produced.arequipe ?? 0) > 0, 'hizo arequipe');
});

test('el Willys del Trapiche no vende la panela que espera la Chiva', () => {
  const game = withLecheria();
  buildLecheria(game);
  const s = game.state;
  // Poca panela: la Chiva espera a llenarse (hasta 10 s) y el Willys sale antes con lo demás.
  s.stations.arequipe_pot.imported = {};
  s.zones.trapiche.warehouse = { panela_powder: 3, cane: 50 };
  const sold = s.stats.sold.panela_powder ?? 0;
  assert.ok(routeReserve(s, 'trapiche').panela_powder > 0, 'reserva para la Chiva');
  run(game, 9);
  assert.equal(s.routes.panela.phase, 'idle', 'la Chiva sigue esperando');
  assert.ok((s.stats.sold.cane ?? 0) > 0, 'el Willys vendió la caña');
  assert.equal(s.stats.sold.panela_powder ?? 0, sold, 'pero no la panela');
});

test('la panela que se va por la ruta no se cuenta dos veces en los ingresos', () => {
  const game = withLecheria();
  buildLecheria(game);
  const s = game.state;
  const flow = routeFlow(s, 'panela');
  assert.ok(flow > 0);
  const withRoute = analyzeChain(s, 'trapiche').income;
  const without = analyzeChain(s, 'trapiche', { exports: false }).income;
  assert.ok(Math.abs(without - withRoute - flow * 250) < 1e-6, `${without} - ${withRoute} ≠ ${flow * 250}`);
});

test('la ruta solo se mejora cuando existe la Paila', () => {
  const game = withLecheria();
  assert.equal(game.quote('route:panela', 1).affordable, false);
  assert.equal(game.buy('route:panela', 1), false);
  buildLecheria(game);
  assert.ok(game.buy('route:panela', 1));
});

test('si la Paila espera panela, la recomendación puede señalar al Trapiche', () => {
  const game = withLecheria(30);
  buildLecheria(game, undefined, 30);
  const s = game.state;
  // La Pulverizadora del Trapiche se queda muy atrás: no alcanza para la Paila.
  s.stations.pulverizer.level = 5;
  s.stations.pulverizer.transport.level = 5;
  const a = analyzeChain(s, 'lecheria');
  assert.ok(a.rows.find((r) => r.id === 'arequipe_pot').importLimited, 'la Paila espera panela');
  const rec = recommendUpgrade(s, (id, mode) => game.quote(id, mode), 'lecheria');
  assert.ok(rec.id.startsWith('pulverizer') || rec.id.startsWith('molds'), `recomendó ${rec.id}`);
});

test('una partida de la v1.1 con el Trapiche completo abre la Lechería y la ruta', async () => {
  const { loadGame } = await import('../src/core/SaveSystem.js');
  const old = new Game().state;
  old.version = 5;
  old.zones.trapiche = { ...old.zones.trapiche, unlocked: true, complete: true };
  delete old.zones.lecheria;
  delete old.routes;
  delete old.stats.imported;
  const store = { 'mitierrita.save': JSON.stringify(old) };
  globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => (store[k] = v), removeItem: (k) => delete store[k] };
  const s = loadGame();
  delete globalThis.localStorage;
  assert.equal(s.zones.lecheria.unlocked, true);
  assert.ok(s.stations.pasture, 'el Potrero produce');
  assert.equal(s.routes.panela.level, 1);
  assert.deepEqual(s.stats.imported, {});
});
