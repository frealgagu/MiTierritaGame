import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/Game.js';
import { branchShare, chainOf } from '../src/sim/chain.js';
import { analyzeChain } from '../src/sim/analysis.js';
import { pendingRoutes } from '../src/sim/transport.js';
import { alerts } from '../src/sim/alerts.js';
import { CALENDAR } from '../src/sim/calendar.js';

// Chain tests: always daytime and no season (calendar is tested in calendar.test.js).
CALENDAR.on = false;

function run(game, seconds) {
  for (let t = 0; t < seconds; t += 0.1) game.step(0.1);
}

// Lechería (with Finca and Trapiche) all at the same level, without opening Cacaotal.
function lecheria(level = 50) {
  const game = new Game();
  const s = game.state;
  s.coins = 1e12;
  game.unlockZone('trapiche');
  game.unlockZone('lecheria');
  for (const z of ['finca', 'trapiche', 'lecheria']) for (const id of chainOf(z).slice(1)) game.unlock(id);
  for (const st of Object.values(s.stations)) st.level = st.transport.level = level;
  for (const z of ['finca', 'trapiche', 'lecheria']) s.zones[z].dispatch.level = level;
  s.routes.panela.level = level;
  return game;
}

test('each branch gets a quarter of the milk; the last one is for the Milk route', () => {
  for (const id of ['cheesery', 'separator', 'arequipe_pot']) assert.equal(branchShare('pasteurizer', id), 0.25);
  assert.equal(branchShare('farm', 'wetmill'), 1);
  const s = lecheria().state;
  assert.deepEqual(pendingRoutes(s, 'pasteurizer').map((r) => r.id), ['leche']);
});

test('milk kept for the route that has not opened yet is not a diversion', () => {
  const game = lecheria();
  const s = game.state;
  run(game, 300);
  const row = analyzeChain(s, 'lecheria').rows.find((r) => r.id === 'pasteurizer');
  assert.ok(Math.abs(row.diverted - row.output / 4) < 1e-6, `${row.diverted} of ${row.output} is sold`);
  for (let t = 0; t < 60; t += 0.1) {
    game.step(0.1);
    assert.equal(alerts(s.stations.pasteurizer).diverting, false);
  }
});

test('a branch below the previous one receives what fits (before it received nothing)', () => {
  const game = lecheria();
  const s = game.state;
  // At level 45, Quesera's input can't hold a full mule load (level 50).
  s.stations.cheesery.level = 45;
  run(game, 300);
  const expected = analyzeChain(s, 'lecheria').rows.find((r) => r.id === 'cheesery').output;
  const before = s.stats.produced.cheese ?? 0;
  run(game, 120);
  const real = ((s.stats.produced.cheese ?? 0) - before) / 120;
  assert.ok(real > expected * 0.95, `cheese ${real.toFixed(2)}/s of ${expected.toFixed(2)}/s`);
  assert.equal(alerts(s.stations.cheesery).starved, false);
});
