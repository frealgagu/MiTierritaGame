import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/Game.js';

function run(game, seconds) {
  for (let t = 0; t < seconds; t += 0.1) game.step(0.1);
}

test('las cerezas viajan a la bodega y el Willys las vende', () => {
  const game = new Game();
  const events = [];
  game.bus.on('sold', (e) => events.push(e));
  run(game, 60);
  assert.ok(events.length > 0, 'debió haber ventas');
  assert.ok(game.state.coins > 0);
  // ~0,5 cerezas/s durante 60 s; descontando el retraso del camino y del viaje.
  assert.ok(game.state.coins >= 10 && game.state.coins <= 30, `monedas: ${game.state.coins}`);
});

test('mejorar el cafetal cuesta monedas y sube el nivel', () => {
  const game = new Game();
  game.state.coins = 100;
  assert.ok(game.buy('farm', 1));
  assert.equal(game.state.stations.farm.level, 2);
  assert.equal(game.state.coins, 95);
  assert.ok(game.buy('farm', 'max'));
  assert.ok(game.state.coins < game.quote('farm', 1).cost);
});

test('si el despacho no da abasto, la bodega se llena y el cafetal se detiene', () => {
  const game = new Game();
  game.state.stations.farm.level = 60; // produce mucho más de lo que el Willys nivel 1 vende
  run(game, 120);
  assert.equal(game.state.stations.farm.blocked, true);
});

test('el progreso sin conexión genera monedas y respeta el tope', () => {
  const game = new Game();
  const { seconds, coins } = game.catchUp(10 * 3600);
  assert.equal(seconds, 2 * 3600);
  assert.ok(coins > 0);
});

test('al cruzar un hito se anuncia el hito alcanzado', () => {
  const game = new Game();
  game.state.coins = 1e6;
  const events = [];
  game.bus.on('levelUp', (e) => events.push(e));
  game.buy('farm', 10); // 1 → 11
  game.buy('farm', 1); // 11 → 12
  assert.equal(events[0].milestone, 10);
  assert.equal(events[1].milestone, null);
});
