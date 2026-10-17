import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/Game.js';
import { analyzeChain } from '../src/sim/analysis.js';
import { muleCount } from '../src/sim/rules.js';
import { busyMules } from '../src/sim/transport.js';

function run(game, seconds) {
  for (let t = 0; t < seconds; t += 0.1) game.step(0.1);
}

test('una estación nunca usa más mulas de las que tiene', () => {
  const game = new Game();
  game.state.stations.farm.level = 30;
  for (let t = 0; t < 60; t += 0.1) {
    game.step(0.1);
    assert.ok(busyMules(game.state, 'farm') <= muleCount(1));
  }
});

test('las mulas vuelven vacías y quedan libres', () => {
  const game = new Game();
  const arrived = [];
  game.bus.on('muleArrived', (m) => arrived.push(m.id));
  run(game, 40);
  assert.ok(arrived.length >= 1);
  assert.ok(game.state.mules.every((m) => m.phase === 'go' || m.amount === 0));
});

test('al principio el cuello de botella son los arrieros del cafetal', () => {
  const game = new Game();
  assert.equal(analyzeChain(game.state).bottleneck, 'farm:transport');
  game.state.coins = 1e6;
  game.buy('farm:transport', 10);
  assert.equal(game.state.stations.farm.transport.level, 11);
  assert.equal(muleCount(11), 2);
  assert.notEqual(analyzeChain(game.state).bottleneck, 'farm:transport');
});

test('mejorar a los arrieros aumenta lo que se vende', () => {
  const slow = new Game();
  const fast = new Game();
  fast.state.stations.farm.transport.level = 15;
  run(slow, 300);
  run(fast, 300);
  assert.ok(fast.state.coins > slow.state.coins * 1.5, `${fast.state.coins} vs ${slow.state.coins}`);
});

test('si los arrieros no dan abasto, el patio se llena por falta de mulas', () => {
  const game = new Game();
  game.state.stations.farm.level = 50;
  game.state.dispatch.level = 50;
  run(game, 60);
  assert.equal(game.state.stations.farm.status, 'blocked');
  assert.equal(game.state.stations.farm.waiting, 'mules');
});
