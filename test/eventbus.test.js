import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/Game.js';

test('si un oyente falla, la compra sigue y los demás oyentes se enteran', () => {
  const game = new Game();
  game.state.coins = 1e6;
  const seen = [];
  const quiet = console.error;
  console.error = () => {};
  game.bus.on('levelUp', () => {
    throw new Error('un efecto del mapa que falla');
  });
  game.bus.on('levelUp', (e) => seen.push(e.id));
  try {
    assert.equal(game.buy('farm', 10), true);
  } finally {
    console.error = quiet;
  }
  assert.equal(game.state.stations.farm.level, 11);
  assert.deepEqual(seen, ['farm']);
});
