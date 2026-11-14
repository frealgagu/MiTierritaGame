import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/Game.js';
import { chainOf } from '../src/sim/chain.js';
import { alerts, stepAlerts } from '../src/sim/alerts.js';

// Stub station: only what stepAlerts inspects.
function fake() {
  const st = { status: 'working', idle: 0 };
  const state = { playTime: 0, stations: { a: st }, zones: {} };
  const run = (status, seconds) => {
    st.status = status;
    for (let t = 0; t < seconds; t += 0.1) {
      state.playTime += 0.1;
      if (status === 'starved') st.idle += 0.1;
      else st.idle = 0;
      stepAlerts(state, 0.1);
    }
  };
  return { st, run };
}

test('a yard full for a moment is not a warning; if it lasts, it is', () => {
  const { st, run } = fake();
  run('working', 10);
  run('blocked', 3); // one third of the window: normal with batched mules
  assert.equal(alerts(st).blocked, false);
  run('working', 10);
  run('blocked', 7); // more than half of the last 10 s
  assert.equal(alerts(st).blocked, true);
  // No flicker: a brief breather doesn't clear it.
  run('working', 3);
  assert.equal(alerts(st).blocked, true);
  // Clears once waiting nearly stops.
  run('working', 9);
  assert.equal(alerts(st).blocked, false);
});

test('waiting between batches is not a warning; being left with nothing for a long time is', () => {
  const { st, run } = fake();
  // Delivery arrives every 5 s: waits half the time, but never 8 s straight.
  for (let k = 0; k < 12; k++) {
    run('starved', 4);
    run('working', 1);
  }
  assert.equal(alerts(st).starved, false);
  run('starved', 15);
  assert.equal(alerts(st).starved, true);
});

test('a leveled Finca warns nothing; with the mule drivers behind, it warns they cannot keep up', () => {
  const game = new Game();
  const s = game.state;
  s.coins = 1e12;
  for (const id of chainOf('finca').slice(1)) game.unlock(id);
  for (const st of Object.values(s.stations)) st.level = st.transport.level = 30;
  s.zones.finca.dispatch.level = 30;
  for (let t = 0; t < 300; t += 0.1) game.step(0.1);
  for (let t = 0; t < 120; t += 0.1) {
    game.step(0.1);
    for (const [id, st] of Object.entries(s.stations)) {
      const a = alerts(st);
      assert.ok(!a.blocked && !a.starved && !a.diverting, `${id} warns ${JSON.stringify(a)}`);
    }
    assert.equal(alerts(s.zones.finca).full, false);
  }
  s.stations.wetmill.transport.level = 1;
  for (let t = 0; t < 60; t += 0.1) game.step(0.1);
  assert.equal(alerts(s.stations.wetmill).blocked, true);
  assert.equal(alerts(s.stations.wetmill).waiting, 'mules');
});
