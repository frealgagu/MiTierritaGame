import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/Game.js';

test('if a listener fails, the purchase goes on and the other listeners hear about it', () => {
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
