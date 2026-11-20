import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/Game.js';
import { ZONES_BY_ID } from '../src/data/zones/index.js';
import { GOALS_BY_ZONE } from '../src/data/goals.js';
import { analyzeChain } from '../src/sim/analysis.js';
import { consumers, isStopped } from '../src/sim/chain.js';
import { setStopped } from '../src/sim/production.js';
import { restartRegion } from '../src/sim/legacy.js';
import { stoppedFor } from '../src/sim/goals.js';
import { createEventState } from '../src/sim/events.js';
import { EVENTS } from '../src/data/events.js';
import { CALENDAR } from '../src/sim/calendar.js';
import { newGame, cafeOf, reload } from './helpers/game.js';

// The Finca with its first stations built and levelled, in a whole game (v5.14: stopping a station).
function finca() {
  const root = newGame();
  const game = new Game(cafeOf(root));
  game.state.coins = 1e9;
  for (const id of ['wetmill', 'dryer']) game.unlock(id);
  for (const st of Object.values(game.state.stations)) st.level = st.transport.level = 15;
  game.state.zones.finca.dispatch.level = 15;
  return { root, game, s: game.state };
}
const run = (game, seconds) => {
  const on = CALENDAR.on;
  CALENDAR.on = false; // always daytime: the comparison is about the stop, not the night
  try {
    for (let t = 0; t < seconds; t += 0.5) game.step(0.5);
  } finally {
    CALENDAR.on = on;
  }
};

test('a stopped station neither produces nor sends out mules; the trips under way finish (v5.14)', () => {
  const { game, s } = finca();
  run(game, 120);
  const made = s.stats.produced.washed ?? 0;
  assert.ok(made > 0);
  s.stations.wetmill.buffer = 10;
  const onTheRoad = s.mules.filter((m) => m.from === 'wetmill').length;
  assert.ok(game.setStopped('wetmill', true));
  assert.ok(isStopped(s, 'wetmill'));
  run(game, 60);
  assert.equal(s.stations.wetmill.status, 'stopped');
  assert.equal(s.stats.produced.washed ?? 0, made, 'nothing more is made');
  assert.equal(s.stations.wetmill.buffer, 10, 'its yard stays as it was');
  assert.equal(s.mules.filter((m) => m.from === 'wetmill').length, 0, `the ${onTheRoad} trips under way finished and none left`);
  // Resumed, it works again.
  game.setStopped('wetmill', false);
  assert.equal(s.stations.wetmill.stopped, undefined);
  run(game, 60);
  assert.ok(s.stats.produced.washed > made);
});

test('what a stopped station would get goes to the other stations that use it, or is sold (v5.14)', () => {
  const { game, s } = finca();
  run(game, 120);
  const soldBefore = s.stats.sold.cherry ?? 0;
  assert.deepEqual(consumers(s, 'farm'), ['wetmill']);
  game.setStopped('wetmill', true);
  assert.deepEqual(consumers(s, 'farm'), [], 'the Beneficiadero takes nothing while stopped');
  const input = s.stations.wetmill.input;
  run(game, 300);
  assert.ok(s.stations.wetmill.input <= input + 1e-9, 'nothing new reaches it');
  assert.ok((s.stats.sold.cherry ?? 0) > soldBefore + 50, 'the cherries are sold instead');
  // With a branch (pasteurized milk feeds three stations), the others take the share of the stopped one.
  const lech = new Game(cafeOf(newGame()));
  lech.state.coins = 1e12;
  lech.unlockZone('trapiche');
  lech.unlockZone('lecheria');
  for (const id of ZONES_BY_ID.lecheria.chain) lech.unlock(id);
  assert.deepEqual(consumers(lech.state, 'pasteurizer'), ['cheesery', 'separator', 'arequipe_pot']);
  lech.setStopped('separator', true);
  assert.deepEqual(consumers(lech.state, 'pasteurizer'), ['cheesery', 'arequipe_pot']);
  const a = analyzeChain(lech.state, 'lecheria');
  assert.equal(a.rows.find((r) => r.id === 'separator').output, 0, 'the analysis counts it as making nothing');
  assert.deepEqual(a.rows.find((r) => r.id === 'pasteurizer').children, ['cheesery', 'arequipe_pot']);
});

test('the stop is saved with the region and cleared when the region restarts; not in events (v5.14)', () => {
  const { root, game } = finca();
  game.setStopped('dryer', true);
  const back = reload(root);
  assert.equal(cafeOf(back).stations.dryer.stopped, true);
  restartRegion(back, 'cafetero');
  assert.ok(Object.values(cafeOf(back).stations).every((st) => !st.stopped));
  const board = createEventState(EVENTS.find((d) => d.zone === 'finca'), 1);
  assert.equal(setStopped(board, Object.keys(board.stations)[0], true), false, 'an event board cannot stop its stations');
});

test('a goal held back by a stopped station names it (v5.14)', () => {
  const { s } = finca();
  const washed = GOALS_BY_ZONE.finca.find((g) => g.type === 'produced' && g.product === 'washed');
  const parchment = GOALS_BY_ZONE.finca.find((g) => g.type === 'produced' && g.product === 'parchment');
  const income = GOALS_BY_ZONE.finca.find((g) => g.type === 'income');
  const level = GOALS_BY_ZONE.finca.find((g) => g.type === 'level');
  assert.equal(stoppedFor(s, washed), null);
  setStopped(s, 'farm', true);
  assert.equal(stoppedFor(s, washed), 'farm', 'upstream counts');
  assert.equal(stoppedFor(s, parchment), 'farm');
  assert.equal(stoppedFor(s, income), 'farm');
  assert.equal(stoppedFor(s, level), null);
  setStopped(s, 'farm', false);
  setStopped(s, 'dryer', true);
  assert.equal(stoppedFor(s, washed), null, 'downstream does not hold it back');
  assert.equal(stoppedFor(s, parchment), 'dryer');
});

test('a route whose only station is stopped waits, and its origin sells instead of keeping a share (v5.14)', async () => {
  const { routeDemand } = await import('../src/sim/routes.js');
  const g = new Game(cafeOf(newGame()));
  g.state.coins = 1e12;
  g.unlockZone('trapiche');
  g.unlockZone('lecheria');
  for (const z of ['trapiche', 'lecheria']) for (const id of ZONES_BY_ID[z].chain) g.unlock(id);
  assert.ok(routeDemand(g.state, 'panela') > 0);
  g.setStopped('arequipe_pot', true);
  assert.equal(routeDemand(g.state, 'panela'), 0);
});
