import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/Game.js';
import { analyzeChain } from '../src/sim/analysis.js';
import { CHAIN, ROAD_POS } from '../src/sim/chain.js';

function run(game, seconds) {
  for (let t = 0; t < seconds; t += 0.1) game.step(0.1);
}

test('las estaciones están en orden sobre el camino', () => {
  const positions = CHAIN.map((id) => ROAD_POS[id]);
  for (let i = 1; i < positions.length; i++) assert.ok(positions[i] > positions[i - 1], `${CHAIN[i]} fuera de orden`);
  assert.ok(ROAD_POS.warehouse > ROAD_POS.packer);
});

test('solo se construye en orden y con monedas', () => {
  const game = new Game();
  game.state.coins = 1e6;
  assert.equal(game.quoteUnlock('dryer').reason, 'order');
  assert.equal(game.unlock('dryer'), false);
  assert.ok(game.unlock('wetmill'));
  assert.equal(game.state.coins, 1e6 - 50);
  assert.ok(game.unlock('dryer'));
  game.state.coins = 0;
  assert.equal(game.quoteUnlock('huller').reason, 'coins');
});

test('el beneficiadero convierte cerezas en café lavado y se vende', () => {
  const game = new Game();
  game.state.coins = 50;
  game.unlock('wetmill');
  run(game, 120);
  assert.ok((game.state.stats.produced.washed ?? 0) > 0, 'produjo café lavado');
  assert.ok((game.state.stats.sold.washed ?? 0) > 0, 'vendió café lavado');
});

test('si la siguiente estación no da abasto, el sobrante se desvía a la bodega', () => {
  const game = new Game();
  game.state.coins = 50;
  game.unlock('wetmill');
  game.state.stations.farm.level = 40; // muchas más cerezas de las que procesa un beneficiadero nivel 1
  game.state.dispatch.level = 40;
  run(game, 90);
  assert.equal(game.state.stations.wetmill.status, 'working');
  assert.ok((game.state.stats.sold.cherry ?? 0) > 0, 'se vendieron cerezas desviadas');
  assert.ok(game.state.stations.farm.lastDiverted > 0);
  assert.equal(analyzeChain(game.state).bottleneck, 'wetmill');
});

test('una estación sin entrada espera', () => {
  const game = new Game();
  game.state.coins = 50;
  game.unlock('wetmill');
  game.step(0.1);
  assert.equal(game.state.stations.wetmill.status, 'starved');
});

test('la cadena completa produce bolsas de café', () => {
  const game = new Game();
  game.state.coins = 1e9;
  for (const id of CHAIN.slice(1)) assert.ok(game.unlock(id), id);
  for (const id of CHAIN) game.state.stations[id].level = 30;
  game.state.dispatch.level = 30;
  run(game, 300);
  assert.ok((game.state.stats.sold.coffee_bag ?? 0) > 0, 'vendió bolsas');
});
